/**
 * HomePage - 앱 메인 홈 화면 (컴팩트 버전)
 *
 * 기능:
 * - 저장된 레시피 요약 통계
 * - 최근 레시피 빠른 접근
 * - 주요 기능 바로가기
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRecipeStore } from '@/stores/useRecipeStore'
import { useAppStore } from '@/stores/useAppStore'
import RecipeCard from '@/components/recipe/RecipeCard'
import {
  Plus,
  BookOpen,
  Calculator,
  Settings,
  Clock,
  ChefHat,
  Sparkles,
  ArrowRight,
  Wheat,
  Cookie,
  Lightbulb
} from 'lucide-react'

export default function HomePage() {
  const { t } = useTranslation()
  const { recipes, setCurrentRecipe, addRecipe } = useRecipeStore()
  const { setActiveTab } = useAppStore()

  // 통계 계산
  const stats = useMemo(() => {
    const categoryCount: Record<string, number> = {}

    recipes.forEach(recipe => {
      const cat = recipe.category || 'other'
      categoryCount[cat] = (categoryCount[cat] || 0) + 1
    })

    return {
      totalRecipes: recipes.length,
      categoryCount
    }
  }, [recipes])

  // 최근 레시피 (최대 6개)
  const recentRecipes = useMemo(() => {
    return [...recipes]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
        return dateB - dateA
      })
      .slice(0, 6)
  }, [recipes])

  // 레시피 선택 핸들러
  const handleRecipeClick = (recipe: any) => {
    setCurrentRecipe(recipe)
    setActiveTab('view')
  }

  // 새 레시피 시작: 빈 레시피를 만들어 로드 (예시 자동주입 없이 빈 상태로 시작)
  // RecipeListPage.createNewRecipe와 동일 패턴 — 대시보드가 빈 재료 1행 + 안내배너로 시작
  const handleNewRecipe = () => {
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
    setActiveTab('dashboard')
  }

  return (
    <div className="home-page bg-surface-canvas flex flex-col h-full">
      {/* 히어로 섹션 - 화이트 베이스 + amber 액센트 (주황 그라디언트 워시 제거) */}
      <div className="home-intro border-b border-line">
        {/* 모바일은 패딩 축소(px-3 py-4), sm 이상에서 데스크톱 패딩(px-4 py-5) 보존 */}
        <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-5">
          <div className="flex items-center gap-3 mb-3">
            {/* 아이콘 배지: 브랜드색은 여기(작은 면적)에만 */}
            <div className="p-2 bg-brand-50 rounded-xl">
              <ChefHat className="w-6 h-6 sm:w-7 sm:h-7 text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-ink">{t('home.title')}</h1>
              <p className="text-ink-subtle text-xs sm:text-sm">{t('home.subtitle')}</p>
            </div>
          </div>

          {/* 대표 primary CTA - 히어로의 단일 주요 행동(새 레시피/변환 시작). handleNewRecipe 재사용 */}
          <button
            onClick={handleNewRecipe}
            className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto mb-3"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            {t('home.newRecipe')}
          </button>

          {/* 통계 카드 - canvas 위 화이트 카드 + 뉴트럴 아이콘, 대표 수치만 brand 강조 */}
          <div className="home-stats grid grid-cols-4 gap-2">
            <div className="bg-surface-paper border border-line rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5 text-ink-subtle text-xs">
                <BookOpen className="w-3.5 h-3.5 text-ink-subtle" />
                {t('home.savedRecipes')}
              </div>
              <div className="text-2xl font-bold text-brand-600 tnum">{stats.totalRecipes}</div>
            </div>
            <div className="bg-surface-paper border border-line rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5 text-ink-subtle text-xs">
                <Wheat className="w-3.5 h-3.5 text-ink-subtle" />
                {t('home.breadRecipes')}
              </div>
              <div className="text-2xl font-bold text-ink">{stats.categoryCount['bread'] || 0}</div>
            </div>
            <div className="bg-surface-paper border border-line rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5 text-ink-subtle text-xs">
                <Sparkles className="w-3.5 h-3.5 text-ink-subtle" />
                {t('home.cakeRecipes')}
              </div>
              <div className="text-2xl font-bold text-ink">
                {(stats.categoryCount['cake'] || 0) + (stats.categoryCount['dessert'] || 0)}
              </div>
            </div>
            <div className="bg-surface-paper border border-line rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5 text-ink-subtle text-xs">
                <Cookie className="w-3.5 h-3.5 text-ink-subtle" />
                {t('home.pastryRecipes')}
              </div>
              <div className="text-2xl font-bold text-ink">
                {(stats.categoryCount['pastry'] || 0) + (stats.categoryCount['cookie'] || 0) + (stats.categoryCount['confectionery'] || 0) + (stats.categoryCount['savory'] || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 본문: 모바일 px-3, sm 이상 기존 px-4 보존 */}
      <div className="container mx-auto px-4 py-6 sm:px-6 flex-1">
        {/* 빠른 시작 - 컴팩트 가로 버튼 */}
        <section className="mb-7">
          <h2 className="text-base font-bold text-ink mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-ink-subtle" />
            {t('home.quickStart')}
          </h2>
          {/* 빠른 시작: 모바일 2열, sm 이상 기존 4열 보존 */}
          <div className="home-shortcuts grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={handleNewRecipe}
              className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] py-3 px-2 bg-surface-paper rounded-lg shadow-card border border-brand-200 hover:border-brand-400 hover:shadow-cardHover transition-all group"
            >
              <div className="p-2 bg-brand-100 rounded-full group-hover:bg-brand-200 transition-colors">
                <Plus className="w-5 h-5 text-brand-600" />
              </div>
              <span className="text-xs font-medium text-ink-muted">{t('home.newRecipe')}</span>
            </button>

            <button
              onClick={() => setActiveTab('recipes')}
              className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] py-3 px-2 bg-surface-paper rounded-lg shadow-card border border-line hover:border-brand-300 hover:shadow-cardHover transition-all group"
            >
              <div className="p-2 bg-surface-muted rounded-full group-hover:bg-line transition-colors">
                <BookOpen className="w-5 h-5 text-ink-muted" />
              </div>
              <span className="text-xs font-medium text-ink-muted">{t('home.recipeList')}</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] py-3 px-2 bg-surface-paper rounded-lg shadow-card border border-line hover:border-brand-300 hover:shadow-cardHover transition-all group"
            >
              <div className="p-2 bg-surface-muted rounded-full group-hover:bg-line transition-colors">
                <Calculator className="w-5 h-5 text-ink-muted" />
              </div>
              <span className="text-xs font-medium text-ink-muted">{t('home.ddtCalculator')}</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="flex flex-col items-center justify-center gap-1.5 min-h-[44px] py-3 px-2 bg-surface-paper rounded-lg shadow-card border border-line hover:border-brand-300 hover:shadow-cardHover transition-all group"
            >
              <div className="p-2 bg-surface-muted rounded-full group-hover:bg-line transition-colors">
                <Settings className="w-5 h-5 text-ink-muted" />
              </div>
              <span className="text-xs font-medium text-ink-muted">{t('nav.settings')}</span>
            </button>
          </div>
        </section>

        {/* 최근 레시피 - 컴팩트 그리드 */}
        {recentRecipes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-ink flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-ink-subtle" />
                {t('home.recentRecipes')}
              </h2>
              <button
                onClick={() => setActiveTab('recipes')}
                className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-0.5 min-h-[44px] px-1"
              >
                {t('home.viewAll')} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 최근 레시피: 모바일 1열, sm 2열, lg 이상 기존 3열 보존.
                H3: 카드 마크업을 RecipeCard(compact) 단일 소스로 통합. 홈은 읽기전용(hideActions). */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onSelect={() => handleRecipeClick(recipe)}
                  compact
                  hideActions
                />
              ))}
            </div>
          </section>
        )}

        {/* 빈 상태 - 풍부한 콘텐츠 포함 (AdSense 정책 준수) */}
        {recipes.length === 0 && (
          <section className="py-6">
            {/* 시작 안내 */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-full mb-3">
                <ChefHat className="w-8 h-8 text-brand-600" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-1">
                {t('home.noRecipesYet')}
              </h3>
              <p className="text-sm text-ink-subtle mb-4">
                {t('home.createFirstRecipe')}
              </p>
              <button
                onClick={handleNewRecipe}
                className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] px-5 text-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                {t('home.createNew')}
              </button>
            </div>

            {/* 주요 기능 소개 - SEO & AdSense 콘텐츠 */}
            <div className="bg-surface-paper rounded-lg shadow-card border border-line p-4 mb-4">
              <h4 className="font-semibold text-ink mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ink-subtle" />
                레시피북 주요 기능
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-ink-muted">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-surface-muted rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-ink-muted text-xs font-bold">1</span>
                  </div>
                  <div>
                    <strong className="text-ink">베이커스 퍼센트 계산</strong>
                    <p className="text-xs mt-0.5">모든 재료를 밀가루 중량 대비 백분율로 자동 변환합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-surface-muted rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-ink-muted text-xs font-bold">2</span>
                  </div>
                  <div>
                    <strong className="text-ink">DDT(반죽온도) 계산</strong>
                    <p className="text-xs mt-0.5">목표 반죽 온도에 맞는 물 온도를 자동 계산합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-surface-muted rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-ink-muted text-xs font-bold">3</span>
                  </div>
                  <div>
                    <strong className="text-ink">팬 크기 스케일링</strong>
                    <p className="text-xs mt-0.5">다양한 팬 크기에 맞춰 레시피를 자동 조정합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-surface-muted rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-ink-muted text-xs font-bold">4</span>
                  </div>
                  <div>
                    <strong className="text-ink">제법 변환</strong>
                    <p className="text-xs mt-0.5">직접법, 스펀지법, 폴리시, 비가 등 제법 간 변환을 지원합니다.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 베이킹 팁 - 추가 콘텐츠 */}
            <div className="bg-surface-muted rounded-lg p-4">
              <h4 className="font-semibold text-ink mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-ink-subtle" />
                베이킹 팁
              </h4>
              <p className="text-sm text-ink-muted leading-relaxed">
                베이커스 퍼센트는 제빵 업계 표준 레시피 표기법입니다. 밀가루를 100%로 기준 삼고
                다른 재료를 백분율로 표시하면, 어떤 양으로 만들어도 일관된 결과를 얻을 수 있습니다.
                레시피북은 이 계산을 자동으로 처리해 드립니다.
              </p>
            </div>
          </section>
        )}
      </div>

      {/* 미니 푸터 */}
      <footer className="bg-surface-muted border-t border-line-soft py-2">
        <div className="container mx-auto px-4 text-center text-xs text-ink-disabled">
          {t('home.version')} v1.0 · {t('home.tagline')}
        </div>
      </footer>
    </div>
  )
}
