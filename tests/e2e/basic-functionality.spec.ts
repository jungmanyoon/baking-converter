import { test, expect } from '@playwright/test'

test.describe('기본 기능 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // 앱 헤더 스코프: index.html의 SEO 정적 콘텐츠(#seo-content)에도 <header>가 있어
  // 그냥 locator('header')는 2개가 잡혀 strict mode 위반. 실제 앱 헤더는 #root 안에 있다.
  const appHeader = (page: import('@playwright/test').Page) => page.locator('#root header')

  test('애플리케이션이 로드되어야 한다', async ({ page }) => {
    await expect(page).toHaveTitle(/내 레시피 목록.*제과제빵 레시피 변환기/)
    await expect(appHeader(page)).toBeVisible()
  })

  test('설정 페이지를 열 수 있어야 한다', async ({ page }) => {
    // 설정 버튼은 아이콘 전용이라 aria-label('설정')로 접근한다.
    // (기존 hasText 필터는 항상 0개 매칭 -> 조건부 스킵으로 false-green 이었음)
    const settingsButton = appHeader(page).getByRole('button', { name: '설정' })
    await expect(settingsButton).toBeVisible()
    await settingsButton.click()
    // 클릭 후 설정 탭이 실제로 활성화되는지 검증(Header active 상태 클래스)
    await expect(settingsButton).toHaveAttribute('aria-current', 'page')
  })

  test('도움말 페이지를 열 수 있어야 한다', async ({ page }) => {
    const helpButton = appHeader(page).getByRole('button', { name: '도움말' })
    await expect(helpButton).toBeVisible()
    await helpButton.click()
    await expect(helpButton).toHaveAttribute('aria-current', 'page')
  })

  test('반응형 디자인이 작동해야 한다', async ({ page }) => {
    // 가로 스크롤이 생기지 않아야 한다(반응형의 핵심 특성) - body visible만 보는 무의미 단언 대체
    const expectNoHorizontalOverflow = async () => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      expect(overflow).toBeLessThanOrEqual(1) // 반올림/스크롤바 오차 1px 허용
    }

    // 데스크톱 뷰
    await page.setViewportSize({ width: 1200, height: 800 })
    await expect(appHeader(page)).toBeVisible()

    // 태블릿 뷰
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(appHeader(page)).toBeVisible()
    await expectNoHorizontalOverflow()

    // 모바일 뷰
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(appHeader(page)).toBeVisible()
    await expectNoHorizontalOverflow()
  })
})
