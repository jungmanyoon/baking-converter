import type { Recipe } from '@/types/recipe.types'

/** 실제 계량표를 저장한다. 계산식을 복제하지 않아 화면과 저장값이 어긋나지 않는다. */
export function captureConversionGroups(groups: { phase: string; items: any[] }[], input: any[]) {
  const phases = groups.map(({ phase, items }, index) => ({
    id: `result-${index}`, type: phase, name: phase, order: index,
    ingredients: items.map((item, row) => {
      const original = input.find(ing => ing.id === item.id) || input.find(ing => ing.name === item.name)
      return {
        ...original, ...item, id: `result-${index}-${row}`, phaseId: `result-${index}`, phase,
        amount: Number(item.convertedAmount), unit: 'g',
        category: item.category === 'wetOther' ? 'fat' : item.category,
        isFlour: item.category === 'flour',
      }
    }),
  }))
  const ingredients = phases.flatMap(phase => phase.ingredients)
  if (!ingredients.length || ingredients.some(ing => !ing.name?.trim() || !Number.isFinite(ing.amount) || ing.amount < 0)
    || !ingredients.some(ing => ing.amount > 0)) throw new Error('Invalid conversion weights')
  return { phases, ingredients, totalWeight: ingredients.reduce((sum, ing) => sum + ing.amount, 0) }
}

/** 변환 설정을 다시 열 때에는 결과가 아닌 당시의 입력에서 시작한다. */
export function recipeForConversion(recipe: Recipe): Recipe {
  return recipe.conversion?.workspace
    ? { ...recipe.conversion.workspace, id: recipe.id, updatedAt: recipe.updatedAt } as Recipe
    : recipe
}

export function conversionName(name: string, multiplier: number, method: string) {
  return `${name.trim()} · ×${Number(multiplier.toFixed(3))} · ${method}`
}
