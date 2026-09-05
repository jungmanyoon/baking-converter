/** 단계별 재료와 평면 재료를 함께 갱신해 재열기 시 이전 중량이 되살아나는 것을 막는다. */
export function syncRecipePhases(phases: any[] | undefined, ingredients: any[]) {
  if (!Array.isArray(phases) || phases.length === 0) return undefined
  const groups = phases.map(phase => ({ ...phase, ingredients: [] as any[] }))
  for (const ingredient of ingredients) {
    let group = groups.find(phase => ingredient.phaseId
      ? phase.id === ingredient.phaseId
      : (phase.type || phase.id || 'main') === (ingredient.phase || 'main'))
    if (!group) {
      group = { id: ingredient.phase || 'main', type: ingredient.phase || 'main', order: groups.length + 1, ingredients: [] }
      groups.push(group)
    }
    group.ingredients.push(ingredient)
  }
  return groups
}

/** 구형 편집기에서도 제법 객체, 단계, 시간 및 온도 정보를 보존한다. */
export function recipeToEditor(recipe: any) {
  const phases = Array.isArray(recipe.phases) ? recipe.phases : []
  const steps = Array.isArray(recipe.steps) ? recipe.steps : []
  const ingredients = phases.length
    ? phases.flatMap((phase: any) => (Array.isArray(phase.ingredients) ? phase.ingredients : []).map((ing: any) => ({ ...ing, phase: phase.type || phase.id || 'main', phaseId: phase.id })))
    : Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  return {
    name: '', description: '', category: 'bread', servings: 1, notes: '',
    ...recipe,
    method: typeof recipe.method === 'object' ? recipe.method?.method || recipe.method?.type || 'straight' : recipe.method || 'straight',
    ingredients: ingredients.map((ing: any) => ({ ...ing, type: ing.category || ing.type || 'other' })),
    instructions: steps.length
      ? steps.map((step: any) => step.instruction || step.description || step.action || '')
      : Array.isArray(recipe.instructions) ? recipe.instructions : [],
    steps,
  }
}

export function editorToRecipe(form: any, original: any) {
  const ingredients = form.ingredients.map((ing: any) => ({
    ...ing, amount: Number(ing.amount), category: ing.type || ing.category || 'other', isFlour: (ing.type || ing.category) === 'flour',
  }))
  return {
    ...form,
    nameKo: form.name !== original?.name ? form.name : original?.nameKo,
    ingredients,
    phases: syncRecipePhases(original?.phases, ingredients),
    method: typeof original?.method === 'object' ? { ...original.method, method: form.method } : form.method,
    steps: form.instructions.map((instruction: string, index: number) => ({
      ...form.steps?.[index], id: form.steps?.[index]?.id || `step-${index + 1}`, order: index + 1, instruction,
    })),
  }
}
