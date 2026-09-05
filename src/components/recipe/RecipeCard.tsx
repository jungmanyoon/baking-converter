import React, { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Recipe, BreadMethod, SourceType } from '@/types/recipe.types'
import { Pencil, Trash2, Youtube, BookOpen, Globe, User, GraduationCap } from 'lucide-react'
import { toast } from '@utils/toast'
import { useLocalization } from '@/hooks/useLocalization'
import { getCategoryMeta } from '@/constants/recipeMeta'
import CategoryHeaderBand from './CategoryHeaderBand'

interface RecipeCardProps {
  recipe: Recipe
  onSelect: () => void
  onDelete?: () => void
  onEdit?: () => void
  onRestore?: (recipe: Recipe) => void
  compact?: boolean
  /** 읽기전용 컨텍스트(예: 홈 최근 레시피): 편집/삭제 액션 버튼 숨김 */
  hideActions?: boolean
}

// 제법 키 매핑 (i18n 키로 변환)
const METHOD_KEYS: Record<string, string> = {
  levain: 'method.levain',
  coldFerment: 'method.coldFerment',
  retard: 'method.retard',
  straight: 'method.straight',
  sponge: 'method.sponge',
  poolish: 'method.poolish',
  biga: 'method.biga',
  tangzhong: 'method.tangzhong',
  autolyse: 'method.autolyse',
  overnight: 'method.retard',
  'no-time': 'method.straight',
  sourdough: 'productType.sourdough'
} as const

// 출처 타입별 아이콘 (색상은 뉴트럴 단색으로 통일 - de-amber/무지개 제거, 아이콘 형태로만 구분)
const SOURCE_CONFIG: Record<SourceType, { icon: React.ElementType; color: string; bgColor: string }> = {
  youtube: { icon: Youtube, color: 'text-ink-muted', bgColor: 'bg-surface-muted' },
  blog: { icon: Globe, color: 'text-ink-muted', bgColor: 'bg-surface-muted' },
  book: { icon: BookOpen, color: 'text-ink-muted', bgColor: 'bg-surface-muted' },
  website: { icon: Globe, color: 'text-ink-muted', bgColor: 'bg-surface-muted' },
  personal: { icon: User, color: 'text-ink-muted', bgColor: 'bg-surface-muted' },
  school: { icon: GraduationCap, color: 'text-ink-muted', bgColor: 'bg-surface-muted' },
  other: { icon: Globe, color: 'text-ink-muted', bgColor: 'bg-surface-muted' }
} as const

// RecipeCard 컴포넌트 최적화
const RecipeCard = memo<RecipeCardProps>(({
  recipe,
  onSelect,
  onDelete,
  onEdit,
  onRestore,
  compact = false,
  hideActions = false
}) => {
  const { t } = useTranslation()
  const { getLocalizedSourceName, getLocalizedRecipeName } = useLocalization()

  // 카테고리 메타 (SSOT) - 아이콘/라벨키 단일 소스
  const categoryMeta = useMemo(() => getCategoryMeta(recipe.category), [recipe.category])

  // 제법 이름 메모이제이션 (method가 객체일 수 있음)
  const methodName = useMemo(() => {
    // method가 객체인 경우 (새 저장 형식)
    if (typeof recipe.method === 'object' && recipe.method !== null) {
      const methodType = (recipe.method as any).method || (recipe.method as any).type;
      const key = METHOD_KEYS[methodType as BreadMethod] || 'method.straight';
      return t(key);
    }
    // method가 문자열인 경우 (기존 형식)
    const key = METHOD_KEYS[recipe.method as BreadMethod] || 'method.straight';
    return t(key);
  }, [recipe.method, t])

  // 제과(pastry)는 제빵 제법(스트레이트법 등)이 대체로 무의미 -> 카드에서 제법 표기 숨김.
  // 단, 슈톨렌처럼 straight가 아닌 제법을 실제로 가진 예외 제과는 계속 노출.
  const showMethod = useMemo(() => {
    if (recipe.productType !== 'pastry') return true
    const methodType = (typeof recipe.method === 'object' && recipe.method !== null)
      ? ((recipe.method as any).method || (recipe.method as any).type)
      : recipe.method
    return !!methodType && methodType !== 'straight'
  }, [recipe.productType, recipe.method])

  // 카테고리 이름 메모이제이션 (SSOT labelKey)
  const categoryName = useMemo(() => t(categoryMeta.labelKey), [categoryMeta, t])

  // 출처 정보 메모이제이션
  const sourceInfo = useMemo(() => {
    if (!recipe.source) return null
    const config = SOURCE_CONFIG[recipe.source.type] || SOURCE_CONFIG.other
    return {
      name: getLocalizedSourceName(recipe.source),
      type: recipe.source.type,
      url: recipe.source.url,
      Icon: config.icon,
      color: config.color,
      bgColor: config.bgColor
    }
  }, [recipe.source, getLocalizedSourceName])

  // 재료 개수 메모이제이션
  const ingredientCount = useMemo(() =>
    recipe.ingredients?.length || 0,
    [recipe.ingredients?.length]
  )

  // 삭제 핸들러 최적화
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const recipeToRestore = recipe

    onDelete?.()
    toast.success(t('message.recipeDeleted'), {
      duration: 5000,
      action: onRestore ? {
        label: t('message.undo'),
        onClick: () => {
          onRestore(recipeToRestore)
        }
      } : undefined
    })
  }, [recipe, onDelete, onRestore, t])

  // 수정 핸들러 최적화
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit()
    }
  }, [onEdit])

  // 선택 핸들러 최적화
  const handleSelect = useCallback(() => {
    onSelect()
  }, [onSelect])
  
  const status = <p className="text-xs text-brand-700 mt-1 mb-2">{t(recipe.conversion ? 'savedRecipe.converted' : 'savedRecipe.original')}{recipe.conversion && ` · ×${Number(recipe.conversion.multiplier.toFixed(3))} · ${recipe.conversion.methodLabel} · ${Number((recipe.totalWeight || 0).toFixed(1))} g`}</p>

  // Compact 뷰 렌더링
  if (compact) {
    return (
      <div
        className="relative bg-surface-paper border border-line rounded-lg hover:shadow-cardHover hover:border-line-strong transition-all"
      >
        {/* H2: 카테고리 헤더밴드 (아이콘형) */}
        <CategoryHeaderBand category={recipe.category} size="sm" className="rounded-t-lg" />
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-ink">
                {/* 카드 전체를 클릭 영역으로 확장하는 stretched button (중첩 인터랙티브 해소) */}
                <button
                  type="button"
                  onClick={handleSelect}
                  aria-label={`${getLocalizedRecipeName(recipe)} (${categoryName})`}
                  className="block w-full truncate text-left cursor-pointer rounded-lg after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {getLocalizedRecipeName(recipe)}
                </button>
              </h3>
              {sourceInfo && (
                <div className="relative z-10 flex items-center gap-1 mt-0.5 text-ink-subtle">
                  <sourceInfo.Icon size={14} className={sourceInfo.color} />
                  <span className="text-xs truncate">{sourceInfo.name}</span>
                </div>
              )}
            </div>
            {!hideActions && (
              <div className="flex gap-1 ml-2 relative z-10">
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="text-ink-disabled hover:text-ink-muted transition-colors p-2 -m-1 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md focus-ring"
                    aria-label={t('recipeList.editRecipe')}
                    type="button"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="text-ink-disabled hover:text-danger transition-colors p-2 -m-1 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md focus-ring"
                    aria-label={t('recipeList.deleteRecipe')}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {status}
          <div className="flex justify-between items-center text-xs text-ink-subtle">
            {showMethod ? <span>{methodName}</span> : <span />}
            <span>{t('recipeList.ingredientCount', { count: ingredientCount })}</span>
          </div>
        </div>
      </div>
    )
  }
  
  // 기본 카드 뷰 렌더링
  return (
    <div
      className="card relative hover:shadow-cardHover transition-shadow"
    >
      {/* H2: 카테고리 헤더밴드 (아이콘형) - .card 의 p-4 를 상쇄해 풀블리드 */}
      <CategoryHeaderBand category={recipe.category} size="md" className="-mx-4 -mt-4 mb-3 rounded-t-xl" />
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          {/* 모바일: text-base(16px), 데스크톱: text-lg(18px) 유지 + 긴 이름 줄바꿈 처리 */}
          <h3 className="text-base sm:text-lg font-semibold text-ink break-words">
            {/* 카드 전체를 클릭 영역으로 확장하는 stretched button (중첩 인터랙티브 해소) */}
            <button
              type="button"
              onClick={handleSelect}
              aria-label={`${getLocalizedRecipeName(recipe)} (${categoryName})`}
              className="block w-full text-left break-words cursor-pointer rounded-lg after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {getLocalizedRecipeName(recipe)}
            </button>
          </h3>
          {status}
          {sourceInfo && (
            <div className="relative z-10 flex items-center gap-1 mt-1 text-ink-subtle">
              <sourceInfo.Icon size={12} className={sourceInfo.color} />
              <span className="text-xs">{sourceInfo.name}</span>
            </div>
          )}
        </div>
        {!hideActions && (
          <div className="flex gap-1 ml-2 relative z-10">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="text-ink-disabled hover:text-ink-muted transition-colors p-2 -m-1 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md focus-ring"
                aria-label={t('recipeList.editRecipe')}
                type="button"
              >
                <Pencil size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="text-ink-disabled hover:text-danger transition-colors p-2 -m-1 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md focus-ring"
                aria-label={t('recipeList.deleteRecipe')}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs px-2 py-1 bg-surface-muted text-ink-muted rounded">
          {categoryName}
        </span>
        {showMethod && (
          <span className="text-xs px-2 py-1 bg-surface-muted text-ink-muted rounded">
            {methodName}
          </span>
        )}
        {sourceInfo && (
          <span className={`text-xs px-2 py-1 ${sourceInfo.bgColor} ${sourceInfo.color} rounded flex items-center gap-1`}>
            <sourceInfo.Icon size={14} />
            {t(`advDashboard.sourceTypes.${sourceInfo.type}`)}
          </span>
        )}
      </div>

      {recipe.notes && (
        <p className="text-sm text-ink-muted mb-3 line-clamp-2">
          {recipe.notes}
        </p>
      )}

      <div className="text-xs text-ink-subtle space-y-1">
        <p>{t('recipeList.ingredients')}: {ingredientCount}</p>
        {recipe.totalTime && (
          <p>{t('recipeList.totalTime')}: {recipe.totalTime}{t('recipeList.minutes')}</p>
        )}
        {recipe.difficulty && (
          <p>{t('recipeList.difficulty')}: {recipe.difficulty}</p>
        )}
      </div>
    </div>
  )
})

RecipeCard.displayName = 'RecipeCard'

export default RecipeCard