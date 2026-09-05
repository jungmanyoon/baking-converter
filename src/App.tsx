import { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@stores/useAppStore'

// i18n 초기화 (앱 시작 시 로드)
import '@/i18n'
import Header from '@components/common/Header.jsx'
import BottomNav from '@components/common/BottomNav.jsx'
import Footer from '@components/common/Footer'
import PWAStatus from '@components/pwa/PWAStatus.jsx'
import PWAInstallPrompt from '@components/pwa/PWAInstallPrompt.jsx'
import { ToastContainer } from '@components/common/ToastContainer'
import { useRecipeStore, useRecipeStorageStatus } from '@stores/useRecipeStore'
import { useAutoSave, useFolderSaveStatus } from '@/hooks/useAutoSave'

// 로딩 스피너 컴포넌트 (SEO를 위한 텍스트 콘텐츠 포함)
function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mb-6"></div>
            <p className="text-ink-muted text-lg mb-4">레시피북을 불러오는 중...</p>
            {/* SEO: 검색엔진이 볼 수 있는 콘텐츠 */}
            <div className="text-ink-subtle text-sm text-center max-w-md">
                <p className="mb-2">
                    레시피북은 제과제빵 전문가와 홈베이커를 위한 무료 레시피 변환 도구입니다.
                </p>
                <p className="mb-2">
                    베이커스 퍼센트 계산, DDT(반죽 목표 온도) 계산, 팬 크기별 레시피 스케일링을 지원합니다.
                </p>
                <p>
                    직접법, 스펀지법, 폴리시, 비가 등 다양한 제법 간 변환이 가능합니다.
                </p>
            </div>
        </div>
    )
}

// ============================================
// 개발환경: 직접 import (HMR 안정성)
// 프로덕션: lazy loading (번들 최적화)
// ============================================
const isDev = import.meta.env.DEV

// 개발환경용 직접 import
import HomePageDirect from '@components/home/HomePage'
import AdvancedDashboardDirect from '@components/dashboard/AdvancedDashboard'
import RecipeListDirect from '@components/recipe/RecipeListPage'
import RecipeEditorDirect from '@components/recipe/RecipeEditor.jsx'
import RecipeViewDirect from '@components/recipe/RecipeView.jsx'
import DDTCalculatorDirect from '@components/conversion/DDTCalculator'
import SettingsPageDirect from '@components/settings/SettingsPage'
import HelpDirect from '@components/help/Help.jsx'
// Legal 페이지
import { PrivacyPolicy, TermsOfService, UserGuide, Contact } from '@components/legal'

// 프로덕션용 lazy import (사용하지 않지만 번들 최적화를 위해 유지)
const HomePageLazy = lazy(() => import('@components/home/HomePage'))
const AdvancedDashboardLazy = lazy(() => import('@components/dashboard/AdvancedDashboard'))
const RecipeListLazy = lazy(() => import('@components/recipe/RecipeListPage'))
const RecipeEditorLazy = lazy(() => import('@components/recipe/RecipeEditor.jsx'))
const RecipeViewLazy = lazy(() => import('@components/recipe/RecipeView.jsx'))
const DDTCalculatorLazy = lazy(() => import('@components/conversion/DDTCalculator'))
const SettingsPageLazy = lazy(() => import('@components/settings/SettingsPage'))
const HelpLazy = lazy(() => import('@components/help/Help.jsx'))

// 환경에 따른 컴포넌트 선택
const HomePage = isDev ? HomePageDirect : HomePageLazy
const AdvancedDashboard = isDev ? AdvancedDashboardDirect : AdvancedDashboardLazy
const RecipeList = isDev ? RecipeListDirect : RecipeListLazy
const RecipeEditor = isDev ? RecipeEditorDirect : RecipeEditorLazy
const RecipeView = isDev ? RecipeViewDirect : RecipeViewLazy
const DDTCalculator = isDev ? DDTCalculatorDirect : DDTCalculatorLazy
const SettingsPage = isDev ? SettingsPageDirect : SettingsPageLazy
const Help = isDev ? HelpDirect : HelpLazy

// 유효한 탭 목록
const VALID_TABS = ['home', 'dashboard', 'workspace', 'recipes', 'view', 'editor', 'calculator', 'settings', 'help', 'privacy', 'terms', 'guide', 'contact']

// 페이지별 타이틀 매핑 (SEO 최적화)
const PAGE_TITLES: Record<string, string> = {
    home: 'seo.titles.home',
    dashboard: 'seo.titles.dashboard',
    workspace: 'seo.titles.dashboard',
    recipes: 'seo.titles.recipes',
    view: 'seo.titles.recipes',
    editor: 'seo.titles.editor',
    calculator: 'seo.titles.calculator',
    settings: 'seo.titles.settings',
    help: 'seo.titles.help',
    privacy: 'seo.titles.privacy',
    terms: 'seo.titles.terms',
    guide: 'seo.titles.guide',
    contact: 'seo.titles.contact'
}

const BASE_TITLE = '제과제빵 레시피 변환기'

// 메인 앱 컴포넌트
function App() {
    const { t } = useTranslation()
    const { activeTab, setActiveTab } = useAppStore()
    const { currentRecipe, addRecipe, updateRecipe, setCurrentRecipe, deleteRecipe } = useRecipeStore()
    const storageFailed = useRecipeStorageStatus(state => state.failed)
    const folderSaveFailed = useFolderSaveStatus(state => state.failed)

    // 앱이 그려지는 즉시 초기 안내를 치워 두 화면이 겹치거나 스크롤이 튀지 않게 한다.
    useLayoutEffect(() => {
        const fallback = document.getElementById('seo-content')
        if (fallback) fallback.hidden = true
        return () => { if (fallback) fallback.hidden = false }
    }, [])

    // 로컬 폴더 자동 저장 (레시피/설정 변경 시 자동 동기화)
    useAutoSave()

    // 동적 페이지 타이틀 업데이트 (SEO 최적화)
    useEffect(() => {
        const titleKey = PAGE_TITLES[activeTab || 'home']
        const pageTitle = t(titleKey, { defaultValue: '' })
        document.title = pageTitle ? `${pageTitle} | ${BASE_TITLE}` : BASE_TITLE
    }, [activeTab, t])

    // 브라우저 히스토리 연동 (뒤로가기/앞으로가기 지원)
    useEffect(() => {
        // URL 해시에서 초기 탭 설정
        const initFromHash = () => {
            const hash = window.location.hash.slice(1) // '#' 제거
            if (hash && VALID_TABS.includes(hash)) {
                setActiveTab(hash as any, false) // 히스토리 푸시 안함
            } else if (!window.location.hash) {
                // 해시 없으면 현재 탭으로 초기화 (replaceState)
                const url = new URL(window.location.href)
                url.hash = activeTab || 'home'
                window.history.replaceState({ tab: activeTab || 'home' }, '', url.toString())
            }
        }

        // popstate 이벤트 핸들러 (뒤로가기/앞으로가기)
        const handlePopState = (event: PopStateEvent) => {
            const tab = event.state?.tab || window.location.hash.slice(1)
            if (tab && VALID_TABS.includes(tab)) {
                setActiveTab(tab as any, false) // 히스토리 푸시 안함
            } else {
                setActiveTab('home', false)
            }
        }

        initFromHash()
        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    }, []) // 최초 마운트시에만 실행

    // 수정 핸들러: 기존 레시피 업데이트
    const handleSaveEdit = (updated: any) => {
        if (currentRecipe?.id) {
            // 기존 레시피 업데이트 (중복 생성 방지). updatedAt은 updateRecipe 내부에서 갱신됨
            updateRecipe(currentRecipe.id, { ...updated, updatedAt: new Date() })
        } else {
            addRecipe(updated)
        }
        if (useRecipeStorageStatus.getState().failed) return false
        setCurrentRecipe(null)
        setActiveTab('recipes')
        return true
    }

    // 현재 탭에 해당하는 컴포넌트 렌더
    const renderActive = () => {
        switch (activeTab) {
            case 'home':
                return <HomePage />
            case 'dashboard':
            case 'workspace':
                return <AdvancedDashboard />
            case 'recipes':
                return <RecipeList />
            case 'view':
                return (
                    <RecipeView
                        recipe={currentRecipe}
                        onBack={() => setActiveTab('recipes')}
                        onEdit={() => setActiveTab(currentRecipe?.conversion ? 'dashboard' : 'editor')}
                        onConvert={() => setActiveTab('dashboard')}
                        onDelete={() => {
                            if (currentRecipe?.id) deleteRecipe(currentRecipe.id)
                            setCurrentRecipe(null)
                            setActiveTab('recipes')
                        }}
                    />
                )
            case 'editor':
                return (
                    <RecipeEditor
                        recipe={currentRecipe}
                        onSave={handleSaveEdit}
                        onCancel={() => {
                            setCurrentRecipe(null)
                            setActiveTab('recipes')
                        }}
                    />
                )
            case 'calculator':
                return <DDTCalculator recipe={currentRecipe as any} />
            case 'settings':
                return <SettingsPage onClose={() => setActiveTab('home')} />
            case 'help':
                return <Help onClose={() => setActiveTab('home')} />
            case 'privacy':
                return <PrivacyPolicy onBack={() => setActiveTab('home')} />
            case 'terms':
                return <TermsOfService onBack={() => setActiveTab('home')} />
            case 'guide':
                return <UserGuide onBack={() => setActiveTab('home')} onNavigate={(tab) => setActiveTab(tab as any)} />
            case 'contact':
                return <Contact onBack={() => setActiveTab('home')} />
            default:
                return <HomePage />
        }
    }

    const isFullWidth = activeTab === 'dashboard' || activeTab === 'workspace' || activeTab === 'home' || !activeTab;
    const showFooter = ['privacy', 'terms', 'guide', 'contact', 'help'].includes(activeTab || '');

    // 개발환경: Suspense 불필요 (직접 import 사용)
    // 프로덕션: Suspense 필요 (lazy loading 사용)
    const content = renderActive()

    return (
        <div className="app-shell min-h-dvh bg-surface-canvas flex flex-col">
            <a href="#main-content" className="skip-link" onClick={event => {
                event.preventDefault()
                document.getElementById('main-content')?.focus()
            }}>{t('workspace.skipContent')}</a>
            <Header />
            <PWAStatus />
            <PWAInstallPrompt />
            <ToastContainer />
            {storageFailed && <div role="alert" className="border-b border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">{t('workspace.saveFailed')}</div>}
            {folderSaveFailed && <div role="alert" className="border-b border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">{t('settings.storage.folderSaveFailed')}</div>}

            {/* 모바일 하단 메뉴와 기기 안전 영역만큼 본문 여백을 확보한다. */}
            <main id="main-content" tabIndex={-1} className={`app-main flex-grow ${isFullWidth ? "" : "container mx-auto px-4 py-6"}`}>
                {isDev ? content : (
                    <Suspense fallback={<LoadingSpinner />}>
                        {content}
                    </Suspense>
                )}
            </main>

            {showFooter && <Footer />}

            {/* 모바일 전용 하단 탭바 (sm 이상에서는 자동 숨김) */}
            <BottomNav />
        </div>
    )
}

export default App
