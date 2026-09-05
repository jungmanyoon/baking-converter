import sampleRecipes from '@/data/sampleRecipes.js'

/** 최초 방문에만 샘플을 넣는다. 빈 목록과 구버전 사용자 데이터도 그대로 보존한다. */
export function initializeStorage(storage: Storage) {
  try {
    if (storage.getItem('recipe-store') === null) {
      storage.setItem('recipe-store', JSON.stringify({
        state: {
          recipes: sampleRecipes,
          filters: { category: [], difficulty: [], searchQuery: '', tags: [] },
          sortBy: 'name',
          draftRecipe: null,
        },
        version: 3,
      }))
    }
    storage.setItem('data-version', 'v3')
    return true
  } catch {
    return false
  }
}
