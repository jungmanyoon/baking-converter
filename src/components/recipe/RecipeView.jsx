import React, { useState } from 'react'
import ConfirmModal from '../common/ConfirmModal'
import { toast } from '@/utils/toast'
import { useTranslation } from 'react-i18next'
import Button from '../common/Button.jsx'
import CategoryHeaderBand from './CategoryHeaderBand'
import { getCategoryMeta } from '@/constants/recipeMeta'
import { ClipboardList, RotateCcw } from 'lucide-react'

function RecipeView({ recipe, onEdit, onDelete, onConvert, onBack }) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!recipe) {
    return (
      <div className="text-center py-8">
        <p className="text-ink-subtle">{t('components.recipeView.noRecipeSelected')}</p>
      </div>
    )
  }

  // 재료 분류 판정: 정식 데이터는 category, 레거시 편집 데이터는 type 을 사용하므로 둘 다 확인
  const isCategory = (ing, cat) => ing.category === cat || ing.type === cat

  const calculateBakersPercentage = (amount, ingredients = recipe.ingredients) => {
    const flourTotal = ingredients
      .filter(ing => isCategory(ing, 'flour'))
      .reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0)

    if (flourTotal === 0) return 0
    return ((amount / flourTotal) * 100).toFixed(1)
  }

  // method가 객체일 수 있으므로 안전하게 표시
  const getMethodName = (method) => {
    const methodKeys = ['straight', 'sponge', 'poolish', 'biga', 'coldFermentation', 'noTime']

    if (typeof method === 'object' && method !== null) {
      const methodType = method.method || method.type
      if (methodKeys.includes(methodType)) {
        return t(`components.recipeView.methods.${methodType}`)
      }
      return methodType || t('components.recipeView.methods.straight')
    }
    if (methodKeys.includes(method)) {
      return t(`components.recipeView.methods.${method}`)
    }
    return method || t('components.recipeView.methods.straight')
  }

  // 제과(pastry) vs 제빵(bread): 수화율/반죽수율/제법은 밀가루-반죽 기반 제빵 지표라
  // 제과(스펀지·거품형 케이크, 쿠키 등)에는 대체로 무의미하다(예: 녹차롤 "수화율 338%").
  // 단, 슈톨렌처럼 straight가 아닌 제법을 실제로 가진 예외 제과는 제법을 계속 노출한다.
  const isPastry = recipe.productType === 'pastry'
  const rawMethodType = (typeof recipe.method === 'object' && recipe.method !== null)
    ? (recipe.method.method || recipe.method.type)
    : recipe.method
  const showBreadMetrics = !isPastry
  const showMethod = !isPastry || (rawMethodType && rawMethodType !== 'straight')

  // 재료 테이블 렌더링 함수
  const renderIngredientTable = (ingredients, title) => {
    const flourTotal = ingredients.filter(ing => isCategory(ing, 'flour')).reduce((sum, ing) => sum + parseFloat(ing.amount || 0), 0)

    return (
      <div>
        {title && <h4 className="font-medium text-ink-muted mb-1 text-sm">{title}</h4>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left py-1">{t('components.recipeView.ingredientName')}</th>
              <th className="text-right py-1">{t('components.recipeView.amount')}</th>
              <th className="text-center py-1">{t('components.recipeView.bakersPercent')}</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient, idx) => (
              <tr key={idx} className="border-b border-line-soft">
                <td className="py-1">{ingredient.name}</td>
                <td className="py-1 text-right">
                  {parseFloat(ingredient.amount).toFixed(1)}{ingredient.unit || 'g'}
                </td>
                <td className="py-1 text-center text-ink-muted">
                  {flourTotal > 0 ? ((parseFloat(ingredient.amount) / flourTotal) * 100).toFixed(1) : '-'}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td className="pt-1">{t('components.recipeView.totalWeight')}</td>
              <td className="pt-1 text-right">
                {ingredients.reduce((sum, ing) => sum + parseFloat(ing.amount || 0), 0).toFixed(1)}g
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  // 변환된 레시피가 있는지 확인
  const hasConversion = recipe.conversionDetails || recipe.convertedFrom

  return (
    <div className="recipe-detail max-w-5xl mx-auto">
      <ConfirmModal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        title={t('components.recipeView.delete')} message={t('workspace.deleteConfirm', { name: recipe.name })}
        actions={[
          { label: t('common.cancel'), onClick: () => setConfirmDelete(false) },
          { label: t('common.delete'), variant: 'danger', onClick: () => { setConfirmDelete(false); onDelete() } },
        ]} />
      <div className="mb-2">
        <Button size="small" variant="secondary" onClick={onBack}>{t('components.recipeView.back')}</Button>
      </div>

      <div className="card mb-3">
        {/* H2: 카테고리 헤더밴드 (아이콘형) - .card 의 p-4 를 상쇄해 풀블리드. 인쇄 시 숨김 */}
        <CategoryHeaderBand category={recipe.category} size="lg" className="-mx-4 -mt-4 mb-3 rounded-t-xl print-hide" />
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-2 flex-wrap">
            <Button size="small" onClick={onConvert}>{t('components.recipeView.convert')}</Button>
            <Button size="small" variant="secondary" onClick={onEdit}>{t('components.recipeView.edit')}</Button>
            <Button size="small" variant="secondary" onClick={() => window.print()}>{t('components.recipeView.print')}</Button>
            <Button variant="secondary" onClick={async () => {
              try {
              if (navigator.share) {
                await navigator.share({
                  title: recipe.name,
                  text: recipe.description,
                  url: window.location.href
                })
              } else {
                toast.warning(t('components.recipeView.shareNotAvailable'))
              }
              } catch (error) {
                if (error.name !== 'AbortError') toast.warning(t('components.recipeView.shareNotAvailable'))
              }
            }}>{t('components.recipeView.share')}</Button>
            <Button size="small" variant="danger" onClick={() => setConfirmDelete(true)}>{t('components.recipeView.delete')}</Button>
          </div>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-ink mb-1">{recipe.name}</h1>
            {recipe.description && (
              <p className="text-ink-muted">{recipe.description}</p>
            )}
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-surface-muted text-ink-muted rounded-full text-sm">
              {t(getCategoryMeta(recipe.category).labelKey)}
            </span>
            {showMethod && (
              <p className="text-sm text-ink-subtle mt-2">
                {getMethodName(recipe.method)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 변환된 레시피가 있으면 좌우로 표시, 없으면 기존 레이아웃 */}
      {hasConversion ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* 원본 레시피 */}
          <div className="card border-2 border-line">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={18} className="text-ink-muted" />
              <h2 className="text-base font-semibold">{t('components.recipeView.originalRecipe')}</h2>
            </div>
            <p className="text-xs text-ink-muted mb-2">
              {t('components.recipeView.method')} {getMethodName(recipe.convertedFrom || 'straight')}
            </p>
            {/* 원본 재료 찾기 - conversionDetails가 있으면 그것을, 없으면 현재 ingredients 사용 */}
            {recipe.conversionDetails && recipe.conversionDetails.originalIngredients 
              ? renderIngredientTable(recipe.conversionDetails.originalIngredients)
              : renderIngredientTable(recipe.ingredients)
            }
          </div>

          {/* 변환된 레시피 */}
          <div className="card border-2 border-line">
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw size={18} className="text-ink-muted" />
              <h2 className="text-base font-semibold">{t('components.recipeView.convertedRecipe')}</h2>
            </div>
            <p className="text-xs text-ink-muted mb-2">
              {t('components.recipeView.method')} {getMethodName(recipe.method)}
            </p>
            {recipe.conversionDetails ? (
              <div className="space-y-2">
                {recipe.conversionDetails.sponge && renderIngredientTable(recipe.conversionDetails.sponge, t('components.recipeView.doughTypes.sponge'))}
                {recipe.conversionDetails.poolish && renderIngredientTable(recipe.conversionDetails.poolish, t('components.recipeView.doughTypes.poolish'))}
                {recipe.conversionDetails.biga && renderIngredientTable(recipe.conversionDetails.biga, t('components.recipeView.doughTypes.biga'))}
                {recipe.conversionDetails.mainDough && renderIngredientTable(recipe.conversionDetails.mainDough, t('components.recipeView.doughTypes.mainDough'))}
              </div>
            ) : (
              renderIngredientTable(recipe.ingredients)
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="card">
            <h2 className="text-base font-semibold mb-2">{t('components.recipeView.ingredients')}</h2>
            {renderIngredientTable(recipe.ingredients)}
          </div>

          <div className="card">
            <h2 className="text-base font-semibold mb-2">{t('components.recipeView.nutritionInfo')}</h2>
            <div className="space-y-2 text-sm">
              {showBreadMetrics && (
                <>
                  <div className="flex justify-between py-1 border-b border-line-soft">
                    <span>{t('components.recipeView.hydration')}</span>
                    <span className="font-medium">
                      {(() => {
                        const flour = recipe.ingredients.filter(ing => isCategory(ing, 'flour')).reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0)
                        const liquid = recipe.ingredients.filter(ing => isCategory(ing, 'liquid')).reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0)
                        return flour > 0 ? ((liquid / flour) * 100).toFixed(1) : 0
                      })()}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-line-soft">
                    <span>{t('components.recipeView.doughYield')}</span>
                    <span className="font-medium">
                      {(() => {
                        const flour = recipe.ingredients.filter(ing => isCategory(ing, 'flour')).reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0)
                        const total = recipe.ingredients.reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0)
                        return flour > 0 ? ((total / flour) * 100).toFixed(1) : 0
                      })()}%
                    </span>
                  </div>
                </>
              )}
              {isPastry && (
                <div className="flex justify-between py-1 border-b border-line-soft">
                  <span>{t('components.recipeView.totalWeight')}</span>
                  <span className="font-medium">
                    {recipe.ingredients.reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0).toFixed(1)}g
                  </span>
                </div>
              )}
              {showMethod && (
                <div className="flex justify-between py-1 border-b border-line-soft">
                  <span>{t('components.recipeView.methodLabel')}</span>
                  <span className="font-medium">{getMethodName(recipe.method)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 변환 상세 정보 */}
      {hasConversion && recipe.conversionDetails && (
        <div className="card mt-3">
          <h3 className="text-base font-medium mb-2">{t('components.recipeView.conversionDetails')}</h3>

          {/* 발효 시간 정보 */}
          {recipe.conversionDetails.fermentationTime && (
            <div className="mb-2 p-2 bg-surface-muted rounded">
              <p className="font-medium mb-1 text-sm">{t('components.recipeView.fermentationTime')}</p>
              {Object.entries(recipe.conversionDetails.fermentationTime).map(([key, value]) => (
                <p key={key} className="text-xs">
                  {t(`components.recipeView.fermentation.${key}`)}
                  {value}
                </p>
              ))}
            </div>
          )}

          {/* 만드는 방법 */}
          {recipe.conversionDetails.instructions && (
            <div className="mb-2">
              <p className="font-medium mb-1 text-sm">{t('components.recipeView.instructions')}</p>
              <ol className="list-decimal list-inside">
                {recipe.conversionDetails.instructions.map((instruction, idx) => (
                  <li key={idx} className="text-xs">{instruction}</li>
                ))}
              </ol>
            </div>
          )}

          {/* 참고사항 */}
          {recipe.conversionDetails.notes && (
            <div className="p-2 bg-surface-muted border border-line rounded">
              <p className="text-xs text-ink-muted">
                <strong>{t('components.recipeView.noteLabel')}</strong> {recipe.conversionDetails.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {recipe.instructions && recipe.instructions.length > 0 && (
        <div className="card mt-3">
          <h2 className="text-base font-semibold mb-2">{t('components.recipeView.instructionsTitle')}</h2>
          <ol className="space-y-2 text-sm">
            {recipe.instructions.map((instruction, index) => (
              <li key={index} className="flex">
                <span className="font-medium text-ink-muted mr-3">{index + 1}.</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {recipe.notes && (
        <div className="card mt-3">
          <h2 className="text-base font-semibold mb-2">{t('components.recipeView.notes')}</h2>
          <p className="text-sm text-ink-muted whitespace-pre-wrap">{recipe.notes}</p>
        </div>
      )}

    </div>
  )
}

export default RecipeView