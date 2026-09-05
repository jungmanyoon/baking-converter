import React from 'react'
import { useTranslation } from 'react-i18next'
import { Home, Scale, BookOpen, Thermometer, Settings, HelpCircle, Wheat } from 'lucide-react'
import { useAppStore } from '@stores/useAppStore'

function Header() {
  const { t } = useTranslation()
  const { activeTab, setActiveTab } = useAppStore()

  // 네비게이션 탭 - 번역 키 사용 (icon은 lucide-react 컴포넌트 참조)
  const navTabs = [
    { id: 'home', labelKey: 'nav.home', icon: Home },
    { id: 'dashboard', labelKey: 'nav.converter', icon: Scale },
    { id: 'recipes', labelKey: 'nav.recipes', icon: BookOpen },
    { id: 'calculator', labelKey: 'nav.ddt', icon: Thermometer },
  ]

  const utilTabs = [
    { id: 'settings', labelKey: 'nav.settings', icon: Settings },
    { id: 'help', labelKey: 'nav.help', icon: HelpCircle },
  ]

  // 탭 공통 스타일: 활성만 브랜드색(amber), 비활성은 뉴트럴. 색이 아니라 "상태"로 위계 표현.
  const tabClass = (active) =>
    `inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] shrink-0 px-2 py-2 sm:px-3 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors ${
      active
        ? 'bg-brand-50 text-brand-700'
        : 'text-ink-subtle hover:bg-surface-muted hover:text-ink'
    }`

  return (
    // 뉴트럴 화이트 헤더 + 스크롤 시 고정. 넓은 주황 풀블리드를 걷어내 "화이트 앱 + 주황 포인트"로.
    <header className="app-header sticky top-0 z-40 bg-surface-paper/90 backdrop-blur border-b border-line text-ink-muted">
      {/* 모바일 패딩 축소(px-2 py-2), sm 이상 기존 패딩(py-3) 보존 */}
      <div className="container mx-auto px-2 py-2 sm:py-3">
        {/* 좁은 화면에서 로고와 nav가 겹치지 않도록 gap 부여 */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo - 터치영역 44px, 좁은 화면에서 줄어들지 않도록 shrink-0. 브랜드색은 아이콘에만. */}
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-2 min-h-[44px] min-w-0 rounded-lg px-1 hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors"
          >
            <Wheat className="w-5 h-5 text-brand-600 shrink-0" />
            {/* 앱 이름: 긴 캐논명이 nav를 밀지 않도록 truncate (모바일 text-base, sm 이상 text-lg) */}
            <span className="text-base sm:text-lg font-bold text-ink truncate">{t('app.name')}</span>
          </button>

          {/* Navigation
              - 모바일: 라벨 숨김(아이콘 only) + 가로 넘침 시 내부 스크롤(overflow-x-auto)로 화면 가로 스크롤 차단
              - sm 이상: 기존 라벨 노출 + 간격 보존 */}
          <nav
            className="flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-x-auto"
            // 모바일 가로 스크롤 시 스크롤바 숨김(별도 CSS 클래스 의존 없이 인라인 처리)
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* 주요 nav: 모바일은 하단 BottomNav로 이동 -> sm 이상에서만 표시 */}
            <div className="hidden md:flex items-center gap-0.5 sm:gap-1">
            {navTabs.map(tab => {
              const Icon = tab.icon
              // #workspace(레거시 별칭)도 변환기 탭을 활성으로 표시
              const active = activeTab === tab.id || (tab.id === 'recipes' && ['view', 'editor'].includes(activeTab)) || (tab.id === 'dashboard' && activeTab === 'workspace')
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={tabClass(active)}
                  aria-label={t(tab.labelKey)}
                  aria-current={active ? 'page' : undefined}
                  title={t(tab.labelKey)}
                >
                  {/* 라벨은 sm 이상에서만 노출(모바일은 아이콘만으로 컴팩트) */}
                  <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                </button>
              )
            })}

            {/* Divider */}
            <span className="w-px h-6 bg-line mx-1 sm:mx-2 shrink-0"></span>
            </div>

            {/* Utility Tabs (설정/도움말) - 모바일 상단 유지 */}
            {utilTabs.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={tabClass(active)}
                  aria-label={t(tab.labelKey)}
                  aria-current={active ? 'page' : undefined}
                  title={t(tab.labelKey)}
                >
                  <Icon className="w-4 h-4" />
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
