import { describe, expect, it, beforeEach, vi } from 'vitest'
import { initializeStorage } from '@/utils/storage/bootstrap'
import { editorToRecipe, recipeToEditor, syncRecipePhases } from '@/utils/recipeEditing'
import { useRecipeStore, useRecipeStorageStatus } from '@/stores/useRecipeStore'

describe('사용자 저장 데이터 보존', () => {
  beforeEach(() => localStorage.clear())

  it('구버전 표시가 있어도 저장된 레시피와 다른 설정을 지우지 않는다', () => {
    const saved = JSON.stringify({ state: { recipes: [{ id: 'mine', name: '내 식빵' }] }, version: 3 })
    localStorage.setItem('recipe-store', saved)
    localStorage.setItem('data-version', 'v1')
    localStorage.setItem('my-setting', 'keep')
    expect(initializeStorage(localStorage)).toBe(true)
    expect(localStorage.getItem('recipe-store')).toBe(saved)
    expect(localStorage.getItem('my-setting')).toBe('keep')
  })

  it('사용자가 비운 목록을 샘플로 다시 채우지 않는다', () => {
    const saved = JSON.stringify({ state: { recipes: [] }, version: 3 })
    localStorage.setItem('recipe-store', saved)
    initializeStorage(localStorage)
    expect(localStorage.getItem('recipe-store')).toBe(saved)
  })

  it('처음 방문했을 때만 샘플을 준비한다', () => {
    initializeStorage(localStorage)
    const saved = JSON.parse(localStorage.getItem('recipe-store')!)
    expect(saved.state.recipes.length).toBeGreaterThan(0)
    expect(saved.version).toBe(3)
  })

  it('저장소가 차단되어도 초기화가 예외를 전파하지 않는다', () => {
    const storage = { getItem: vi.fn(() => { throw new Error('blocked') }) } as unknown as Storage
    expect(initializeStorage(storage)).toBe(false)
  })

  it('용량 초과를 화면에 알리고 다음 저장 성공 시 오류를 해제한다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    useRecipeStore.getState().setSortBy('updatedAt')
    expect(useRecipeStorageStatus.getState().failed).toBe(true)
    write.mockRestore()
    useRecipeStore.getState().setSortBy('name')
    expect(useRecipeStorageStatus.getState().failed).toBe(false)
    warn.mockRestore()
  })
})

describe('레시피 편집 후 재열기', () => {
  const original = {
    name: '탕종 식빵', nameKo: '탕종 식빵',
    method: { method: 'tangzhong', waterRatio: 5 },
    phases: [{ id: 'starter', type: 'tangzhong', name: '탕종', temperature: 65,
      ingredients: [{ id: 'flour', name: '강력분', amount: 50, category: 'flour' }] }],
    steps: [{ id: 'cook', instruction: '탕종을 익힌다', duration: { target: 5 }, temperature: { target: 65 }, phase: 'tangzhong' }],
  }

  it('공정 설명을 불러오고 수정 후 시간과 온도를 보존한다', () => {
    const form = recipeToEditor(original)
    expect(form.instructions).toEqual(['탕종을 익힌다'])
    form.instructions[0] = '탕종을 천천히 익힌다'
    form.ingredients[0].amount = '75'
    form.name = '수정한 식빵'
    const saved = editorToRecipe(form, original)
    expect(saved.steps[0]).toMatchObject({ instruction: '탕종을 천천히 익힌다', duration: { target: 5 }, temperature: { target: 65 }, phase: 'tangzhong' })
    expect(saved.method).toEqual(original.method)
    expect(saved.nameKo).toBe('수정한 식빵')
    expect(saved.phases[0]).toMatchObject({ name: '탕종', temperature: 65 })
    expect(recipeToEditor(saved).ingredients[0].amount).toBe(75)
    expect(original.phases[0].ingredients[0].amount).toBe(50)
  })

  it('재료 삭제와 새로운 단계 추가도 저장된 단계에 반영한다', () => {
    const phases = syncRecipePhases(original.phases, [{ id: 'water', name: '물', amount: 100, phase: 'main' }])!
    expect(phases[0].ingredients).toEqual([])
    expect(phases[1].ingredients[0].name).toBe('물')
  })

  it('종류가 같아도 서로 다른 단계 ID의 재료를 섞지 않는다', () => {
    const phases = syncRecipePhases([
      { id: 'a', type: 'main', ingredients: [] },
      { id: 'b', type: 'main', ingredients: [] },
    ], [{ id: 'x', phaseId: 'b', phase: 'main', amount: 10 }])!
    expect(phases[0].ingredients).toHaveLength(0)
    expect(phases[1].ingredients).toHaveLength(1)
  })
})
