/**
 * AutocompleteInput - 한글 초성 검색 지원 자동완성 입력
 * "박ㄹ" → "박력분" 같은 초성 검색 가능
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { searchIngredients, sortByRelevance } from '@/utils/hangul'
import { findIngredientInfo } from '@/data/ingredientDatabase'
import { useSettingsStore } from '@/stores/useSettingsStore'
import {
  Wheat,
  Droplet,
  Milk,
  Egg,
  Apple,
  Leaf,
  Nut,
  Package,
  CircleDot,
  Candy,
  Cookie,
  Sparkles,
  type LucideIcon
} from 'lucide-react'

interface AutocompleteInputProps {
  value: string
  displayValue?: string  // 편집 중이 아닐 때 표시할 값 (번역된 이름 등)
  onChange: (value: string) => void
  onSelect?: (value: string) => void
  placeholder?: string
  className?: string
  suggestions?: string[]  // 커스텀 추천 목록 (기본: 재료 목록)
  maxSuggestions?: number
  disabled?: boolean
  autoFocus?: boolean
}

export default function AutocompleteInput({
  value,
  displayValue,
  onChange,
  onSelect,
  placeholder,
  className = '',
  suggestions: customSuggestions,  // 커스텀 목록이 주어지면 그것을 사용
  maxSuggestions = 8,
  disabled = false,
  autoFocus = false
}: AutocompleteInputProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('components.autocomplete.placeholder')
  const listboxId = useId()
  // 설정 스토어에서 통합 재료 목록 가져오기 (커스텀 목록이 없을 때만)
  const getAllIngredientNames = useSettingsStore(state => state.getAllIngredientNames)
  // 커스텀 재료 배열을 구독해 변경 시에만 재계산(매 렌더 새 배열 생성으로 인한 useMemo 무력화 방지)
  const customIngredients = useSettingsStore(state => state.ingredient.customIngredients)
  const suggestions = useMemo(
    () => customSuggestions ?? getAllIngredientNames(),
    [customSuggestions, getAllIngredientNames, customIngredients]
  )
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [recentIngredients, setRecentIngredients] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // 최근 사용 재료 로드
  useEffect(() => {
    const saved = localStorage.getItem('recentIngredients')
    if (saved) {
      try {
        setRecentIngredients(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [])

  // 최근 사용 재료 저장
  const saveRecentIngredient = useCallback((ingredient: string) => {
    setRecentIngredients(prev => {
      const filtered = prev.filter(i => i !== ingredient)
      const updated = [ingredient, ...filtered].slice(0, 10)
      localStorage.setItem('recentIngredients', JSON.stringify(updated))
      return updated
    })
  }, [])

  // 필터링된 추천 목록
  const filteredSuggestions = useMemo(() => {
    if (!value.trim()) {
      // 입력이 없으면 최근 사용 재료 표시
      return recentIngredients.slice(0, maxSuggestions)
    }

    // 검색 및 정렬
    const searched = searchIngredients(suggestions, value)
    const sorted = sortByRelevance(searched, value)
    return sorted.slice(0, maxSuggestions)
  }, [value, suggestions, recentIngredients, maxSuggestions])

  // 선택 처리
  const handleSelect = useCallback((selected: string) => {
    onChange(selected)
    onSelect?.(selected)
    saveRecentIngredient(selected)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }, [onChange, onSelect, saveRecentIngredient])

  // 키보드 네비게이션
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true)
        return
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          handleSelect(filteredSuggestions[highlightedIndex])
        } else if (filteredSuggestions.length > 0) {
          handleSelect(filteredSuggestions[0])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
      case 'Tab':
        if (isOpen && highlightedIndex >= 0) {
          e.preventDefault()
          handleSelect(filteredSuggestions[highlightedIndex])
        }
        break
    }
  }, [isOpen, highlightedIndex, filteredSuggestions, handleSelect])

  // 입력 변경
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setIsOpen(true)
    setHighlightedIndex(-1)
  }, [onChange])

  // 포커스 처리
  const handleFocus = useCallback(() => {
    setIsOpen(true)
    setIsFocused(true)
  }, [])

  // 블러 처리 (딜레이로 클릭 이벤트 처리)
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsOpen(false)
      setIsFocused(false)
      setHighlightedIndex(-1)
    }, 200)
  }, [])

  // 하이라이트된 항목 스크롤
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement
      if (item) {
        item.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  // 카테고리 아이콘 매핑 (lucide - 1:1 없는 항목은 가장 가까운/중립 아이콘)
  const getCategoryIcon = (name: string): LucideIcon | null => {
    const info = findIngredientInfo(name)
    if (!info) return null

    const iconMap: Record<string, LucideIcon> = {
      flour: Wheat,
      liquid: Droplet,
      fat: Droplet,      // 유지: 전용 아이콘 없어 Droplet
      sugar: Candy,
      egg: Egg,
      dairy: Milk,
      leavening: Sparkles, // 팽창(기포) 근사
      salt: CircleDot,     // 소금 전용 아이콘 없어 중립 점
      flavoring: Leaf,
      nut: Nut,
      fruit: Apple,
      chocolate: Cookie,
      other: Package
    }
    return iconMap[info.category] || null
  }

  // 표시할 값: 포커스 중에는 원본값(검색용), 아니면 displayValue 또는 원본값
  const shownValue = isFocused ? value : (displayValue ?? value)

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={resolvedPlaceholder}
        aria-expanded={isOpen && filteredSuggestions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined}
        value={shownValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full px-3 py-2 border border-line rounded-md
          focus:ring-2 focus:ring-brand-400 focus:border-brand-400
          disabled:bg-surface-muted disabled:cursor-not-allowed
          ${className}`}
        autoComplete="off"
      />

      {/* 추천 목록 드롭다운 */}
      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          id={listboxId}
          className="absolute z-50 w-full mt-1 bg-surface-paper border border-line
            rounded-lg shadow-dropdown max-h-60 overflow-auto"
        >
          {!value.trim() && recentIngredients.length > 0 && (
            <li role="presentation" className="px-3 py-1 text-xs text-ink-subtle bg-surface-muted border-b">
              {t('components.autocomplete.recentlyUsed')}
            </li>
          )}
          {filteredSuggestions.map((item, index) => {
            const CategoryIcon = getCategoryIcon(item)
            return (
              <li
                key={item}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleSelect(item)}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2
                  ${index === highlightedIndex
                    ? 'bg-brand-100 text-brand-900'
                    : 'hover:bg-surface-muted'
                  }`}
              >
                {CategoryIcon
                  ? <CategoryIcon className="w-4 h-4 text-ink-subtle flex-shrink-0" strokeWidth={1.75} />
                  : <span className="w-4 h-4 flex-shrink-0" />}
                <span className="flex-1">{item}</span>
                {index === highlightedIndex && (
                  <span className="text-xs text-ink-disabled">Enter</span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* 입력 힌트 */}
      {isOpen && value.trim() && filteredSuggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 px-3 py-2 bg-surface-muted
          border border-line rounded-lg text-sm text-ink-subtle">
          {t('components.autocomplete.noMatch', { value })}
        </div>
      )}
    </div>
  )
}
