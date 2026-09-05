/**
 * useRecipeStore - import 정규화/라운드트립 테스트
 * sanitizeRecipe 방어(불량 레시피 정규화)가 실제로 동작함을 고정한다.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRecipeStore, selectFilteredRecipes } from '@stores/useRecipeStore'

// jsdom Blob에는 .text()가 없어 FileReader로 읽는다
const blobToText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(blob)
  })

const resetStore = () => {
  useRecipeStore.setState({
    recipes: [],
    currentRecipe: null,
    draftRecipe: null,
    filters: { category: [], difficulty: [], searchQuery: '', tags: [], timeRange: undefined },
    sortBy: 'name',
    selectedRecipeIds: [],
    isEditing: false
  })
}

describe('useRecipeStore.importRecipes - 정규화', () => {
  beforeEach(() => {
    resetStore()
  })

  it('name/category/ingredients가 누락된 불량 객체도 크래시 없이 정규화되어 유입된다', async () => {
    await useRecipeStore.getState().importRecipes([
      {} as any,                              // 전부 누락
      { name: 123 } as any,                   // name이 문자열이 아님
      { name: '유효빵', category: 'cake' } as any
    ])

    const recipes = useRecipeStore.getState().recipes
    expect(recipes).toHaveLength(3)

    // 모든 항목이 핵심 불변식을 갖춰야 한다
    recipes.forEach(r => {
      expect(typeof r.id).toBe('string')
      expect(typeof r.name).toBe('string')
      expect(r.category).toBeDefined()
      expect(Array.isArray(r.ingredients)).toBe(true)
      expect(Array.isArray(r.tags)).toBe(true)
      expect(Array.isArray(r.steps)).toBe(true)
      expect(r.createdAt instanceof Date).toBe(true)
    })

    // name이 문자열이 아니거나 없으면 '(이름 없음)'으로 대체
    expect(recipes.some(r => r.name === '(이름 없음)')).toBe(true)
  })

  it('null/undefined/문자열/숫자 등 비객체 항목은 스킵한다', async () => {
    await useRecipeStore.getState().importRecipes([
      null as any,
      undefined as any,
      '문자열' as any,
      42 as any,
      { name: '진짜', category: 'bread' } as any
    ])

    const recipes = useRecipeStore.getState().recipes
    expect(recipes).toHaveLength(1)
    expect(recipes[0].name).toBe('진짜')
  })

  it('id가 없는 항목도 고유 id가 부여되어 유입된다(중복 제거로 무력화되지 않음)', async () => {
    await useRecipeStore.getState().importRecipes([
      { name: 'A', category: 'bread' } as any,
      { name: 'B', category: 'bread' } as any
    ])

    const recipes = useRecipeStore.getState().recipes
    expect(recipes).toHaveLength(2)
    const ids = recipes.map(r => r.id)
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(2)
  })

  it('이미 존재하는 id는 중복 유입되지 않는다', async () => {
    await useRecipeStore.getState().importRecipes([
      { id: 'dup', name: 'A', category: 'bread' } as any
    ])
    await useRecipeStore.getState().importRecipes([
      { id: 'dup', name: 'A-again', category: 'bread' } as any
    ])
    const recipes = useRecipeStore.getState().recipes
    expect(recipes).toHaveLength(1)
    expect(recipes[0].name).toBe('A')
  })

  it('파일 안의 중복 ID도 건너뛰고 실제 추가/생략 개수를 반환한다', async () => {
    const result = await useRecipeStore.getState().importRecipes([
      { id: 'same', name: 'A' }, { id: 'same', name: 'B' }, null, [],
    ] as any)
    expect(result).toEqual({ added: 1, skipped: 3 })
    expect(useRecipeStore.getState().recipes).toHaveLength(1)
  })

  it('저장 한도 초과 시 가져오기가 성공으로 끝나지 않는다', async () => {
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await expect(useRecipeStore.getState().importRecipes([{ id: 'new', name: 'New' } as any])).rejects.toThrow('Recipe storage failed')
    } finally { write.mockRestore(); warning.mockRestore() }
  })

  it('빈 배열/비배열 입력에도 안전하다', async () => {
    await useRecipeStore.getState().importRecipes([])
    expect(useRecipeStore.getState().recipes).toHaveLength(0)

    // 비배열이 넘어와도 크래시 없이 무시
    await useRecipeStore.getState().importRecipes(null as any)
    expect(useRecipeStore.getState().recipes).toHaveLength(0)
  })
})

describe('useRecipeStore - selectFilteredRecipes 정렬 안정성', () => {
  beforeEach(() => {
    resetStore()
  })

  it('불량 데이터가 섞여 있어도 sortBy=name 정렬이 크래시하지 않는다', async () => {
    await useRecipeStore.getState().importRecipes([
      {} as any,                              // name 누락 -> '(이름 없음)'
      { name: 'zzz', category: 'bread' } as any,
      { name: 'aaa', category: 'cake' } as any
    ])
    useRecipeStore.setState({ sortBy: 'name' })

    const filtered = selectFilteredRecipes(useRecipeStore.getState())
    expect(Array.isArray(filtered)).toBe(true)
    expect(filtered).toHaveLength(3)

    // 실제로 name 오름차순(localeCompare)으로 정렬되어야 한다
    const names = filtered.map(r => r.name)
    const expectedOrder = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(expectedOrder)
  })

  it('카테고리 필터가 정규화된 데이터에서 동작한다', async () => {
    await useRecipeStore.getState().importRecipes([
      { name: '식빵', category: 'bread' } as any,
      { name: '케이크', category: 'cake' } as any
    ])
    useRecipeStore.setState({
      filters: { category: ['bread'], difficulty: [], searchQuery: '', tags: [], timeRange: undefined }
    })

    const filtered = selectFilteredRecipes(useRecipeStore.getState())
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('식빵')
  })
})

describe('useRecipeStore - export/import 라운드트립', () => {
  beforeEach(() => {
    resetStore()
  })

  it('export한 JSON을 다시 import하면 동일 개수/ID가 복원된다', async () => {
    await useRecipeStore.getState().importRecipes([
      { id: 'r1', name: 'One', category: 'bread' } as any,
      { id: 'r2', name: 'Two', category: 'cake' } as any
    ])

    const blob = await useRecipeStore.getState().exportRecipes()
    const text = await blobToText(blob)
    const parsed = JSON.parse(text)
    expect(parsed).toHaveLength(2)

    // 리셋 후 재유입
    resetStore()
    await useRecipeStore.getState().importRecipes(parsed)

    const restored = useRecipeStore.getState().recipes
    expect(restored).toHaveLength(2)
    expect(restored.map(r => r.id).sort()).toEqual(['r1', 'r2'])
  })
})
