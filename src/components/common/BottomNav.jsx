import React from 'react'
import { useTranslation } from 'react-i18next'
import { Home, Scale, BookOpen, Thermometer, Settings } from 'lucide-react'
import { useAppStore } from '@stores/useAppStore'

/**
 * 모바일 전용 하단 고정 탭바 (D5)
 * - 상단 헤더의 아이콘-only nav는 375px에서 라벨을 못 담아 판독이 어려움 -> 하단바로 라벨 노출.
 * - sm 이상에서는 숨기고(상단 nav 사용), 모바일에서만 표시.
 */
function BottomNav() {
  const { t } = useTranslation()
  const { activeTab, setActiveTab } = useAppStore()

  const tabs = [
    { id: 'home', labelKey: 'nav.home', icon: Home },
    { id: 'dashboard', labelKey: 'nav.converter', icon: Scale, alias: 'workspace' },
    { id: 'recipes', labelKey: 'nav.recipes', icon: BookOpen },
    { id: 'calculator', labelKey: 'nav.ddt', icon: Thermometer },
    { id: 'settings', labelKey: 'nav.settings', icon: Settings },
  ]

  return (
    <nav
      className="bottom-nav md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-paper/95 backdrop-blur border-t border-line flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('nav.primary', { defaultValue: '주요 메뉴' })}
    >
      {tabs.map(tab => {
        const Icon = tab.icon
        const active = activeTab === tab.id || (tab.id === 'recipes' && ['view', 'editor'].includes(activeTab)) || (tab.alias && activeTab === tab.alias)
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 text-xs font-medium focus-ring ${
              active ? 'text-brand-700' : 'text-ink-subtle'
            }`}
            aria-current={active ? 'page' : undefined}
            aria-label={t(tab.labelKey)}
          >
            <Icon className={`w-5 h-5 ${active ? 'text-brand-600' : ''}`} />
            <span className="leading-none">{t(tab.labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
