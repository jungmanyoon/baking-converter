import { describe, it, expect } from 'vitest'
import { captureConversionGroups, recipeForConversion } from '@/utils/recipeConversion'

describe('변환본의 계량 데이터', () => {
  it('폴리시와 본반죽의 표시 중량을 저장하고 입력을 보존한다', () => {
    const input = [{ id: 'flour', name: '강력분', amount: 500, category: 'flour', note: '체치기' }]
    const result = captureConversionGroups([
      { phase: 'poolish', items: [{ id: 'flour', name: '강력분', category: 'flour', convertedAmount: 300 }] },
      { phase: 'main', items: [{ id: 'flour', name: '강력분', category: 'flour', convertedAmount: 700 }] },
    ], input)
    expect(result.totalWeight).toBe(1000)
    expect(result.ingredients.map(ing => ing.amount)).toEqual([300, 700])
    expect(new Set(result.ingredients.map(ing => ing.id)).size).toBe(2)
    expect(result.ingredients[0].note).toBe('체치기')
    expect(input[0].amount).toBe(500)
  })

  it('설정 재편집은 저장 당시 입력에서 시작하여 배수가 중복 적용되지 않는다', () => {
    const recipe: any = { id: 'converted', ingredients: [{ amount: 1000 }], conversion: {
      workspace: { name: '식빵', ingredients: [{ amount: 500 }], multiplierConfig: { multiplier: 2 } },
    } }
    const restored = recipeForConversion(JSON.parse(JSON.stringify(recipe)))
    expect(restored.ingredients[0].amount).toBe(500)
    expect(restored.multiplierConfig?.multiplier).toBe(2)
    expect(restored.id).toBe('converted')
    expect(restored.conversion).toBeUndefined()
    expect(recipe.ingredients[0].amount).toBe(1000)
  })

  it.each([NaN, Infinity, -1])('잘못된 결과 %s는 저장하지 않는다', amount => {
    expect(() => captureConversionGroups([{ phase: 'main', items: [{ convertedAmount: amount }] }], [])).toThrow()
  })
})
