import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../common/Button.jsx'
import Input from '../common/Input.jsx'
import { COMMON_INGREDIENTS } from '../../constants/ingredients.js'
import { Trash2 } from 'lucide-react'

// 편집 행 재정렬/삽입/삭제 시 React key 안정성을 위한 고유 키 생성기
let ingredientRowKeySeq = 0
const genIngredientRowKey = () => `ing-row-${Date.now()}-${ingredientRowKeySeq++}`

function IngredientTable({ ingredients = [], onChange }) {
  const { t } = useTranslation()
  // 재료가 비어있으면 기본 행 추가 / 기존 행에 안정 key가 없으면 부여(마운트 1회)
  React.useEffect(() => {
    if (ingredients.length === 0) {
      onChange([{ _key: genIngredientRowKey(), name: '', amount: '', unit: 'g', type: 'flour' }])
    } else if (ingredients.some(ing => ing._key === undefined)) {
      onChange(ingredients.map(ing => (ing._key !== undefined ? ing : { ...ing, _key: genIngredientRowKey() })))
    }
  }, [])
  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = {
      ...newIngredients[index],
      [field]: value
    }
    onChange(newIngredients)
  }

  const handleKeyDown = (e, rowIndex, field) => {
    // Tab/Shift+Tab은 브라우저 기본 이동을 보존하고 Enter만 다음 행으로 이동한다.
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    const nextRow = rowIndex + 1
    const nextField = field
    if (nextRow >= ingredients.length) {
      // 마지막 행 복사하여 새 행 추가
      const last = ingredients[ingredients.length - 1] || { name: '', amount: '', unit: 'g', type: 'flour' }
      const cloned = { ...last, _key: genIngredientRowKey(), name: '', amount: '' }
      onChange([...ingredients, cloned])
      setTimeout(() => {
        const el = document.querySelector(`[data-cell="${ingredients.length}:${nextField}"]`)
        if (el) el.focus()
      }, 0)
      return
    }
    const el = document.querySelector(`[data-cell="${nextRow}:${nextField}"]`)
    if (el) el.focus()
  }

  const addIngredient = () => {
    onChange([...ingredients, { _key: genIngredientRowKey(), name: '', amount: '', unit: 'g', type: 'flour' }])
  }

  const removeIngredient = (index) => {
    onChange(ingredients.filter((_, i) => i !== index))
  }

  const calculateBakersPercentage = (amount) => {
    const flourTotal = ingredients
      .filter(ing => ing.type === 'flour')
      .reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0)
    
    if (flourTotal === 0) return 0
    return ((amount / flourTotal) * 100).toFixed(1)
  }

  return (
    <div>
      <datalist id="ingredient-names">
        {Object.values(COMMON_INGREDIENTS).map((ing) => (
          <option key={ing.id} value={ing.name} />
        ))}
      </datalist>
      <table className="editor-ingredients w-full text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="text-left py-1">{t('ingredientTable.ingredientName')}</th>
            <th className="text-left py-1">{t('ingredientTable.amount')}</th>
            <th className="text-left py-1">{t('ingredientTable.unit')}</th>
            <th className="text-left py-1">{t('ingredientTable.type')}</th>
            <th className="text-center py-1">BP%</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ingredient, index) => (
            <tr key={ingredient._key ?? index} className="border-b border-line-soft">
              <td className="py-1 pr-2">
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  className="w-full px-2 py-1 border border-line rounded text-sm"
                  placeholder={t('ingredientTable.placeholder')}
                  data-cell={`${index}:name`}
                  onKeyDown={(e) => handleKeyDown(e, index, 'name')}
                  list="ingredient-names"
                  aria-label={`${index + 1} ${t('ingredientTable.ingredientName')}`}
                />
              </td>
              <td className="py-1 pr-2">
                <input
                  type="number" min="0" step="any" inputMode="decimal"
                  value={ingredient.amount}
                  onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                  className="w-full px-2 py-1 border border-line rounded text-sm"
                  placeholder="0"
                  data-cell={`${index}:amount`}
                  onKeyDown={(e) => handleKeyDown(e, index, 'amount')}
                  aria-label={`${index + 1} ${t('ingredientTable.amount')}`}
                />
              </td>
              <td className="py-1 pr-2">
                <select
                  value={ingredient.unit}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  className="w-full px-2 py-1 border border-line rounded text-sm"
                  data-cell={`${index}:unit`}
                  onKeyDown={(e) => handleKeyDown(e, index, 'unit')}
                  aria-label={`${index + 1} ${t('ingredientTable.unit')}`}
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="개">{t('ingredientTable.piece')}</option>
                  <option value="큰술">{t('ingredientTable.tbsp')}</option>
                  <option value="작은술">{t('ingredientTable.tsp')}</option>
                </select>
              </td>
              <td className="py-1 pr-2">
                <select
                  value={ingredient.type}
                  onChange={(e) => handleIngredientChange(index, 'type', e.target.value)}
                  className="w-full px-2 py-1 border border-line rounded text-sm"
                  data-cell={`${index}:type`}
                  onKeyDown={(e) => handleKeyDown(e, index, 'type')}
                  aria-label={`${index + 1} ${t('ingredientTable.type')}`}
                >
                  <option value="flour">{t('ingredientCategory.flour')}</option>
                  <option value="liquid">{t('ingredientCategory.liquid')}</option>
                  <option value="fat">{t('ingredientCategory.fat')}</option>
                  <option value="sugar">{t('ingredientCategory.sugar')}</option>
                  <option value="salt">{t('ingredientCategory.salt')}</option>
                  <option value="yeast">{t('ingredientCategory.yeast')}</option>
                  <option value="egg">{t('ingredientCategory.egg')}</option>
                  <option value="other">{t('ingredientCategory.other')}</option>
                </select>
              </td>
              <td className="py-1 text-center text-ink-muted text-sm">
                {calculateBakersPercentage(parseFloat(ingredient.amount) || 0)}%
              </td>
              <td className="py-1">
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="p-2 -m-1 text-ink-subtle hover:text-danger transition-colors inline-flex items-center justify-center min-w-[36px] min-h-[36px]"
                  aria-label={t('ingredientTable.delete')}
                  title={t('ingredientTable.delete')}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2">
        <Button variant="secondary" size="small" onClick={addIngredient}>
          {t('ingredientTable.addIngredient')}
        </Button>
      </div>

      <div className="mt-2 p-2 bg-surface-muted rounded">
        <div className="text-xs text-ink-muted">
          <p><strong>{t('ingredientTable.totalWeight')}:</strong> {ingredients.reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0).toFixed(1)}g</p>
          <p><strong>{t('ingredientTable.flourTotal')}:</strong> {ingredients.filter(ing => ing.type === 'flour').reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0).toFixed(1)}g</p>
          <p><strong>{t('ingredientTable.hydration')}:</strong> {(() => {
            const flour = ingredients.filter(ing => ing.type === 'flour').reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0)
            const liquid = ingredients.filter(ing => ing.type === 'liquid').reduce((sum, ing) => sum + (parseFloat(ing.amount) || 0), 0)
            return flour > 0 ? ((liquid / flour) * 100).toFixed(1) : 0
          })()}%</p>
        </div>
      </div>
    </div>
  )
}

export default IngredientTable