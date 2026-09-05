import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import RecipeList from './RecipeList'
import SearchBar from '@components/common/SearchBar'
import FilterControls from './FilterControls'
import AdModal from '@components/ads/AdModal'
import { useRecipeStore, selectFilteredRecipes } from '@stores/useRecipeStore'
import { useAppStore } from '@stores/useAppStore'
import { toast } from '@utils/toast'

// 무료 레시피 개수 제한
const FREE_RECIPE_LIMIT = 10

const RecipeListPage: React.FC = () => {
  const { t } = useTranslation()
  const {
    recipes,
    filters,
    sortBy,
    addRecipe,
    deleteRecipe,
    setCurrentRecipe,
    setFilters,
    setSortBy,
    clearFilters,
    getAvailableTags
  } = useRecipeStore()
  const filteredRecipes = useRecipeStore(selectFilteredRecipes)
  const availableTags = useRecipeStore(getAvailableTags)
  const { setActiveTab } = useAppStore()

  // 광고 모달 상태
  const [showAdModal, setShowAdModal] = useState(false)

  const handleSelect = useCallback((recipe: any) => {
    setCurrentRecipe(recipe)
    // 카드 선택 = 읽기 전용 상세 뷰로 이동 (편집/변환은 뷰 내부 버튼에서)
    setTimeout(() => setActiveTab('view'), 0)
  }, [setCurrentRecipe, setActiveTab])

  const handleDelete = useCallback((id: string) => {
    deleteRecipe(id)
  }, [deleteRecipe])

  const handleRestore = useCallback((recipe: any) => {
    addRecipe(recipe)
  }, [addRecipe])

  const handleEdit = useCallback((recipe: any) => {
    setCurrentRecipe(recipe)
    setTimeout(() => setActiveTab('editor'), 0)
  }, [setCurrentRecipe, setActiveTab])

  // 실제 새 레시피 생성 함수
  const createNewRecipe = useCallback(() => {
    const newRecipe = {
      id: `recipe-${Date.now()}`,
      name: t('recipe.newRecipe'),
      description: '',
      category: 'bread',
      method: 'straight',
      servings: 1,
      ingredients: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    } as any
    addRecipe(newRecipe)
    setCurrentRecipe(newRecipe)
    setTimeout(() => setActiveTab('dashboard'), 0)
  }, [addRecipe, setCurrentRecipe, setActiveTab, t])

  // 새 레시피 버튼 핸들러 (광고 체크)
  const handleNew = useCallback(() => {
    // 무료 레시피 개수 초과 시 광고 모달 표시
    if (recipes.length >= FREE_RECIPE_LIMIT) {
      setShowAdModal(true)
    } else {
      createNewRecipe()
    }
  }, [recipes.length, createNewRecipe])

  // 광고 완료 후 레시피 생성
  const handleAdComplete = useCallback(() => {
    setShowAdModal(false)
    createNewRecipe()
    toast.success(t('message.adThanks'))
  }, [createNewRecipe, t])

  const handleSearchChange = useCallback((searchQuery: string) => {
    setFilters({ ...filters, searchQuery })
  }, [filters, setFilters])

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters)
  }, [setFilters])

  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    setSortBy(newSortBy)
  }, [setSortBy])

  const handleClearFilters = useCallback(() => {
    clearFilters()
  }, [clearFilters])

  return (
    <div className="recipe-library flex flex-col h-full gap-5">
      {/* Search and Filter Controls */}
      {/* relative z-20: 필터 드롭다운(absolute)이 아래 목록 위로 겹쳐 뜨도록 스택 컨텍스트 확보.
          (이전 overflow-x-hidden 은 CSS 상 overflow-y:auto 를 강제해 드롭다운을 잘라내던 버그 -> 제거) */}
      <div className="relative z-20 flex-none p-3 sm:p-4 bg-surface-paper border border-line rounded-xl">
        {/* 검색 + 필터 토글 + 정렬을 한 줄 툴바로 (세로 공간 절약). 상세 필터는 펼칠 때만 아래 표시. */}
        <FilterControls
          filters={filters}
          sortBy={sortBy}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
          availableTags={availableTags}
        >
          <SearchBar
            value={filters.searchQuery || ''}
            onChange={handleSearchChange}
            placeholder={t('recipeList.searchPlaceholder')}
          />
        </FilterControls>
      </div>

      {/* Recipe List */}
      <div className="flex-1 overflow-auto">
        <RecipeList
          recipes={filteredRecipes}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onNew={handleNew}
          onRestore={handleRestore}
        />
      </div>

      {/* 광고 모달 (10개 초과 시) */}
      <AdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onComplete={handleAdComplete}
      />
    </div>
  )
}

export default RecipeListPage

