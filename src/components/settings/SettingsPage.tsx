/**
 * 설정 페이지 - 모든 설정 탭 통합
 * 사용자 커스터마이징을 위한 종합 설정 페이지
 *
 * 적용: --persona-frontend (UX) + --persona-architect (구조 설계)
 */

import { useState, useCallback, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/useSettingsStore'
import PanSettingsTab from './PanSettingsTab'
import ProductSettingsTab from './ProductSettingsTab'
import EnvironmentSettingsTab from './EnvironmentSettingsTab'
import MethodSettingsTab from './MethodSettingsTab'
import YieldLossSettingsTab from './YieldLossSettingsTab'
import IngredientSettingsTab from './IngredientSettingsTab'
import AdvancedSettingsTab from './AdvancedSettingsTab'
import StorageSettingsTab from './StorageSettingsTab'
import LocaleSettingsTab from './LocaleSettingsTab'
import {
  Settings,
  Box,
  Thermometer,
  FlaskConical,
  TrendingDown,
  Apple,
  Cog,
  Download,
  Upload,
  RotateCcw,
  X,
  Check,
  AlertTriangle,
  ChevronLeft,
  Scale,
  HardDrive,
  Globe
} from 'lucide-react'

// 설정 그룹 정의 (H6: 도메인 정확판 - 일반/계산 설정/시스템). 순서 = 렌더 순서 SSOT.
const SETTINGS_GROUPS = [
  { id: 'general', labelKey: 'settingsGroups.general' },
  { id: 'calc', labelKey: 'settingsGroups.calc' },
  { id: 'system', labelKey: 'settingsGroups.system' },
] as const

// 활성 탭 공통 스타일 (9개 탭 동일 → 개별 필드 대신 단일 상수로 축약). active=brand, inactive=gray.
const TAB_ACTIVE_COLOR = 'text-brand-600'
const TAB_ACTIVE_BG = 'bg-brand-50'
const TAB_ACTIVE_BORDER = 'border-brand-200'

// 탭 정의 (번역 키 사용). group 기준으로 렌더 시 묶으며, 배열 순서가 각 그룹 내 순서.
const TABS = [
  // 일반
  { id: 'locale', group: 'general', nameKey: 'settingsTabs.locale', icon: Globe, descKey: 'settingsTabs.localeDesc' },
  // 계산 설정 (팬/제품 비용적/환경/제법/수율/재료 - 모두 변환 계산 입력)
  { id: 'pan', group: 'calc', nameKey: 'settingsTabs.pan', icon: Box, descKey: 'settingsTabs.panDesc' },
  { id: 'product', group: 'calc', nameKey: 'settingsTabs.product', icon: Scale, descKey: 'settingsTabs.productDesc' },
  { id: 'environment', group: 'calc', nameKey: 'settingsTabs.environment', icon: Thermometer, descKey: 'settingsTabs.environmentDesc' },
  { id: 'method', group: 'calc', nameKey: 'settingsTabs.method', icon: FlaskConical, descKey: 'settingsTabs.methodDesc' },
  { id: 'yieldLoss', group: 'calc', nameKey: 'settingsTabs.yieldLoss', icon: TrendingDown, descKey: 'settingsTabs.yieldLossDesc' },
  { id: 'ingredient', group: 'calc', nameKey: 'settingsTabs.ingredient', icon: Apple, descKey: 'settingsTabs.ingredientDesc' },
  // 시스템 (저장/데이터, 고급/앱 설정)
  { id: 'storage', group: 'system', nameKey: 'settingsTabs.storage', icon: HardDrive, descKey: 'settingsTabs.storageDesc' },
  { id: 'advanced', group: 'system', nameKey: 'settingsTabs.advanced', icon: Cog, descKey: 'settingsTabs.advancedDesc' }
]

interface SettingsPageProps {
  className?: string
  onClose?: () => void
  initialTab?: string
}

export default function SettingsPage({
  className = '',
  onClose,
  initialTab = 'locale'
}: SettingsPageProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState('')
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)

  const { exportSettings, importSettings, resetAllSettings } = useSettingsStore()

  // 내보내기 처리
  const handleExport = useCallback(() => {
    const data = exportSettings()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recipe-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportModal(false)
  }, [exportSettings])

  // 가져오기 처리
  const handleImport = useCallback(() => {
    setImportError('')
    setImportSuccess(false)

    if (!importData.trim()) {
      setImportError(t('settings.modal.enterData'))
      return
    }

    const success = importSettings(importData)
    if (success) {
      setImportSuccess(true)
      setTimeout(() => {
        setShowImportModal(false)
        setImportData('')
        setImportSuccess(false)
      }, 1500)
    } else {
      setImportError(t('settings.modal.invalidFormat'))
    }
  }, [importData, importSettings, t])

  // 파일로 가져오기
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setImportData(content)
      setImportError('')
      // 같은 파일을 다시 선택해도 onChange 가 발화하도록 값 초기화
      input.value = ''
    }
    reader.onerror = () => {
      setImportError(t('settings.modal.invalidFormat'))
      input.value = ''
    }
    reader.readAsText(file)
  }, [t])

  // 초기화 처리
  const handleResetAll = useCallback(() => {
    if (confirm(t('settings.modal.resetConfirm'))) {
      if (confirm(t('settings.modal.resetConfirm2'))) {
        resetAllSettings()
      }
    }
  }, [resetAllSettings, t])

  // 탭 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'locale':
        return <LocaleSettingsTab />
      case 'storage':
        return <StorageSettingsTab />
      case 'pan':
        return <PanSettingsTab />
      case 'product':
        return <ProductSettingsTab />
      case 'environment':
        return <EnvironmentSettingsTab />
      case 'method':
        return <MethodSettingsTab />
      case 'yieldLoss':
        return <YieldLossSettingsTab />
      case 'ingredient':
        return <IngredientSettingsTab />
      case 'advanced':
        return <AdvancedSettingsTab />
      default:
        return <StorageSettingsTab />
    }
  }

  return (
    <div className={`min-h-screen bg-surface-muted ${className}`}>
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-surface-paper border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          {/* 모바일: 헤더 버튼이 많아 가로 넘침 방지를 위해 gap 축소, 버튼 라벨은 sm 이상에서만 표시 */}
          <div className="flex items-center justify-between gap-2 h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] hover:bg-surface-muted rounded-lg transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <Settings className="w-6 h-6 text-ink-muted flex-shrink-0" />
                <h1 className="text-lg sm:text-xl font-bold text-ink truncate">{t('settings.title')}</h1>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* 터치타깃 44px 보장(min-h-[44px]), 모바일은 아이콘만/데스크톱은 라벨 동반 */}
              <button
                onClick={() => setShowExportModal(true)}
                aria-label={t('common.export')}
                className="flex items-center justify-center gap-1 min-h-[44px] px-2 sm:px-3 text-sm text-ink-muted hover:bg-surface-muted rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t('common.export')}</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                aria-label={t('common.import')}
                className="flex items-center justify-center gap-1 min-h-[44px] px-2 sm:px-3 text-sm text-ink-muted hover:bg-surface-muted rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">{t('common.import')}</span>
              </button>
              <button
                onClick={handleResetAll}
                aria-label={t('common.reset')}
                className="flex items-center justify-center gap-1 min-h-[44px] px-2 sm:px-3 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">{t('common.reset')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        {/* 모바일: 세로 스택(flex-col) + 데스크톱: 좌측 탭 2단 레이아웃(lg:flex-row) 보존 */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* 모바일: 상단 가로 스크롤 탭바 / 데스크톱(lg:): 좌측 세로 사이드바 보존 */}
          <div className="w-full lg:w-56 lg:flex-shrink-0">
            <label className="block lg:hidden text-sm font-semibold text-ink">
              {t('workspace.settingsCategory')}
              <select className="input w-full mt-2" value={activeTab} onChange={e => setActiveTab(e.target.value)}>
                {SETTINGS_GROUPS.map(group => (
                  <optgroup key={group.id} label={t(group.labelKey)}>
                    {TABS.filter(tab => tab.group === group.id).map(tab => (
                      <option key={tab.id} value={tab.id}>{t(tab.nameKey)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            {/* H6: 그룹(일반/계산 설정/시스템)별로 묶어 렌더. 모바일 가로 스크롤엔 edge-fade(mask)로
                더 스크롤 가능함을 암시. 데스크톱은 mask 해제 + 그룹 소제목 노출. */}
            <nav className="hidden lg:flex flex-row lg:flex-col gap-1 lg:gap-0 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 lg:sticky lg:top-24 [mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)] lg:[mask-image:none]">
              {SETTINGS_GROUPS.map(group => (
                <Fragment key={group.id}>
                  {/* 그룹 소제목: 데스크톱 세로 사이드바에서만 (모바일 가로 탭엔 폭 낭비 방지) */}
                  <div className="hidden lg:block px-4 pt-4 pb-1 first:pt-0 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                    {t(group.labelKey)}
                  </div>
                  {TABS.filter(tab => tab.group === group.id).map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 lg:gap-3 min-h-[44px] flex-shrink-0 lg:w-full px-3 lg:px-4 py-2 lg:py-3 lg:mb-1 rounded-lg text-left whitespace-nowrap lg:whitespace-normal transition-all ${
                          isActive
                            ? `${TAB_ACTIVE_BG} ${TAB_ACTIVE_BORDER} border-2`
                            : 'hover:bg-surface-muted border-2 border-transparent'
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? TAB_ACTIVE_COLOR : 'text-ink-disabled'}`} />
                        <div className="min-w-0">
                          <div className={`text-sm font-medium ${isActive ? 'text-ink' : 'text-ink-muted'}`}>
                            {t(tab.nameKey)}
                          </div>
                          {/* 설명문은 데스크톱에서만 노출(모바일 가로 탭에서는 폭 절약 위해 숨김) */}
                          <div className="hidden lg:block text-xs text-ink-subtle truncate">
                            {t(tab.descKey)}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </Fragment>
              ))}
            </nav>
          </div>

          {/* 메인 콘텐츠 - 모바일 전체 폭 */}
          <div className="flex-1 min-w-0">
            <div className="bg-surface-paper rounded-xl shadow-sm border p-4 sm:p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      {/* 내보내기 모달 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-paper rounded-xl shadow-modal w-full max-w-md p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('settings.modal.exportTitle')}</h3>
              <button
                onClick={() => setShowExportModal(false)}
                aria-label={t('common.cancel')}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 hover:bg-surface-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-ink-muted mb-4">
              {t('settings.modal.exportDesc')}
            </p>
            {/* 모바일: 버튼 세로 스택 / 데스크톱: 우측 정렬 가로 배치 보존 */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="min-h-[44px] px-4 py-2 border rounded-lg hover:bg-surface-muted"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1 min-h-[44px] px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
              >
                <Download className="w-4 h-4" />
                {t('common.download')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 가져오기 모달 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-paper rounded-xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('settings.modal.importTitle')}</h3>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportData('')
                  setImportError('')
                  setImportSuccess(false)
                }}
                aria-label={t('common.cancel')}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 hover:bg-surface-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importSuccess ? (
              <div className="flex items-center gap-2 p-4 bg-success-50 text-success-700 rounded-lg">
                <Check className="w-5 h-5" />
                {t('settings.modal.importSuccess')}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-ink-muted mb-2">
                    {t('settings.modal.selectFile')}
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="w-full text-sm text-ink-subtle file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-surface-muted file:text-ink-muted hover:file:bg-surface-muted"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-ink-muted mb-2">
                    {t('settings.modal.orPaste')}
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder='{"pan": {...}, "method": {...}, ...}'
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono resize-none"
                  />
                </div>

                {importError && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-danger-50 text-danger-600 rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {importError}
                  </div>
                )}

                {/* 모바일: 버튼 세로 스택 / 데스크톱: 우측 정렬 가로 배치 보존 */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                  <button
                    onClick={() => {
                      setShowImportModal(false)
                      setImportData('')
                      setImportError('')
                    }}
                    className="min-h-[44px] px-4 py-2 border rounded-lg hover:bg-surface-muted"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!importData.trim()}
                    className="flex items-center justify-center gap-1 min-h-[44px] px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:bg-line-strong disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    {t('common.import')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
