import { test, expect, type Page } from '@playwright/test'

const recipe = {
  id: 'personal-recipe', name: '나의 테스트 식빵', category: 'bread', productType: 'bread',
  tags: [], difficulty: 'beginner', servings: 1, totalTime: 30,
  createdAt: '2026-09-01', updatedAt: '2026-09-01', method: 'straight',
  ingredients: [{ id: 'flour', name: '강력분', amount: 500, category: 'flour', unit: 'g' },
    { id: 'water', name: '물', amount: 300, category: 'liquid', unit: 'g' }],
  steps: [{ id: 'mix', order: 1, instruction: '재료를 섞는다', time: 5, temp: 26 }],
}

async function seed(page: Page) {
  await page.addInitScript(value => {
    if (localStorage.getItem('review-initialized')) return
    localStorage.setItem('review-initialized', 'yes')
    localStorage.setItem('data-version', 'old')
    localStorage.setItem('recipe-store', JSON.stringify({ version: 3, state: {
      recipes: [value], filters: { category: [], difficulty: [], searchQuery: '', tags: [] }, sortBy: 'name',
    } }))
  }, recipe)
}

async function openConverter(page: Page) {
  await page.goto('/#recipes', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /나의 테스트 식빵/ }).click()
  await page.getByRole('button', { name: '레시피 변환', exact: true }).click()
  await expect(page.locator('.workspace-original')).toBeAttached()
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
}

test.beforeEach(async ({ page }) => seed(page))

test('2배 폴리시를 저장하고 재편집해도 원본과 계량표가 보존된다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openConverter(page)
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes[0])
  await page.locator('.workspace-tabs').getByRole('button', { name: '변환 설정' }).click()
  await page.getByRole('button', { name: '자동', exact: true }).click()
  await page.getByRole('button', { name: '×2', exact: true }).click()
  await page.locator('.workspace-settings').getByRole('button', { name: '제법', exact: true }).click()
  await page.locator('.workspace-settings').getByRole('button', { name: '폴리시', exact: true }).click()
  await page.locator('.workspace-tabs').getByRole('button', { name: '계량 결과' }).click()
  const amounts = await page.locator('.workspace-result tbody tr').evaluateAll(rows => rows
    .filter(row => row.querySelectorAll('td').length > 1)
    .map(row => Number(row.querySelector('td:last-child')!.textContent!.trim())))
  await page.locator('.workspace-heading').getByRole('button', { name: '변환본 저장' }).click()
  const sheet = page.locator('.saved-weighing-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('폴리시')
  await expect(sheet).toContainText('본반죽')
  await expect(page.locator('.saved-instructions')).toContainText('재료를 섞는다')
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes)
  expect(saved).toHaveLength(2)
  expect(saved[0]).toEqual(original)
  expect(saved[1].ingredients.map((ing: any) => ing.amount)).toEqual(amounts)
  expect(saved[1].ingredients.filter((ing: any) => ing.category === 'flour').reduce((sum: number, ing: any) => sum + ing.amount, 0)).toBe(1000)
  const firstResult = saved[1].ingredients
  await noOverflow(page)
  await page.screenshot({ path: '.review-shots/saved-conversion-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: '.review-shots/saved-conversion-desktop.png', fullPage: true })
  await page.reload()
  await expect(sheet).toBeVisible()
  await page.getByRole('button', { name: '변환 설정 수정', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: '강력분 g', exact: true })).toHaveValue('500')
  await page.locator('.workspace-tools').getByRole('button', { name: '변환본 저장', exact: true }).first().click()
  await expect(sheet).toBeVisible()
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes)
  expect(saved).toHaveLength(2)
  expect(saved[0]).toEqual(original)
  expect(saved[1].ingredients).toEqual(firstResult)
})

test('출처 없는 개인 레시피와 의도적으로 비운 목록을 보존한다', async ({ page }) => {
  await page.goto('/#recipes', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: /나의 테스트 식빵/ })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes.length)).toBe(1)
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('recipe-store')!)
    saved.state.recipes = []
    localStorage.setItem('recipe-store', JSON.stringify(saved))
  })
  await page.reload()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes)).toEqual([])
})

for (const width of [360, 390, 768]) {
  test(`${width}px: 입력 → 배수 변경 → 계량 → 공정 → 저장 후 재열기`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await openConverter(page)
    const tabs = page.locator('.workspace-tabs')
    await page.getByRole('spinbutton', { name: '강력분 g', exact: true }).fill('650')
    await tabs.getByRole('button', { name: '변환 설정' }).click()
    await expect(page.locator('.workspace-settings')).toBeVisible()
    await page.getByRole('button', { name: '자동', exact: true }).click()
    await page.getByRole('button', { name: '×2', exact: true }).click()
    await tabs.getByRole('button', { name: '계량 결과' }).click()
    await expect(page.locator('.workspace-original')).toBeHidden()
    await expect(page.locator('.workspace-result')).toContainText('1300')
    await noOverflow(page)
    await tabs.getByRole('button', { name: '공정·메모' }).click()
    await expect(page.locator('.workspace-process')).toContainText('재료를 섞는다')
    await page.locator('.workspace-heading').getByRole('button', { name: '변환본 저장' }).click()
    await expect(page.locator('.saved-weighing-sheet')).toContainText('1300')
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes)
    expect(saved[0].ingredients[0].amount).toBe(500)
    expect(saved[1].ingredients[0].amount).toBe(1300)
    await page.reload()
    await expect(page.locator('.saved-weighing-sheet')).toContainText('1300')
    await page.getByRole('button', { name: '변환 설정 수정', exact: true }).click()
    await expect(page.getByRole('spinbutton', { name: '강력분 g', exact: true })).toHaveValue('650')
    await noOverflow(page)
  })
}

test('PC에서 원본과 두 배 결과를 나란히 비교한다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openConverter(page)
  await page.getByRole('button', { name: '자동', exact: true }).click()
  await page.getByRole('button', { name: '×2', exact: true }).click()
  await expect(page.locator('.workspace-original')).toBeVisible()
  await expect(page.locator('.workspace-result')).toContainText('1000')
  await page.getByRole('button', { name: '전문가', exact: true }).click()
  await expect(page.locator('.workspace-settings')).toBeVisible()
  await noOverflow(page)
})

test('휴대폰에서 모든 설정 분류에 접근할 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/#settings', { waitUntil: 'domcontentloaded' })
  const menu = page.getByLabel('설정 항목')
  for (const tab of ['locale', 'pan', 'product', 'environment', 'method', 'yieldLoss', 'ingredient', 'storage', 'advanced']) {
    await menu.selectOption(tab)
    await expect(menu).toHaveValue(tab)
    await noOverflow(page)
  }
})

test('상세 화면 삭제는 확인과 취소를 거치며 마지막 삭제 후 샘플이 복원되지 않는다', async ({ page }) => {
  await page.goto('/#recipes', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /나의 테스트 식빵/ }).click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await dialog.getByRole('button', { name: '삭제', exact: true }).click()
  await expect(page.getByRole('button', { name: /나의 테스트 식빵/ })).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes)).toEqual([])
})

test('모바일 편집기는 공정을 보여주고 키보드 이동과 중량 저장을 지원한다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/#recipes', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /나의 테스트 식빵/ }).click()
  await page.getByRole('button', { name: '편집', exact: true }).click()
  await expect(page.locator('.recipe-editor input').last()).toHaveValue('재료를 섞는다')
  const amount = page.locator('[data-cell="0:amount"]')
  await amount.fill('700')
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('[data-cell="0:name"]')).toBeFocused()
  await noOverflow(page)
  await page.locator('.editor-actions').getByRole('button', { name: '저장' }).click()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes[0])
  expect(saved.ingredients[0].amount).toBe(700)
  expect(saved.steps[0]).toMatchObject({ instruction: '재료를 섞는다', time: 5, temp: 26 })
})

test('공정 화면에서 인쇄해도 원본과 결과가 포함된다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openConverter(page)
  await page.locator('.workspace-tabs').getByRole('button', { name: '공정·메모' }).click()
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.workspace-original')).toBeVisible()
  await expect(page.locator('.workspace-result')).toBeVisible()
  await expect(page.locator('.workspace-process')).toBeVisible()
  await expect(page.locator('.bottom-nav')).toBeHidden()
})

test('재료가 많아도 원본과 결과 표 안에 세로 스크롤이 생기지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#recipes', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('recipe-store')!)
    saved.state.recipes[0].ingredients = Array.from({ length: 24 }, (_, i) => ({
      id: `ingredient-${i}`, name: `재료 ${i + 1}`, amount: 100, category: i ? 'other' : 'flour', unit: 'g',
    }))
    localStorage.setItem('recipe-store', JSON.stringify(saved))
  })
  await page.reload()
  await page.getByRole('button', { name: /나의 테스트 식빵/ }).click()
  await page.getByRole('button', { name: '레시피 변환', exact: true }).click()
  await page.getByRole('button', { name: '자동', exact: true }).click()
  await page.getByRole('button', { name: '×2', exact: true }).click()
  await expect(page.locator('.workspace-original .ingredient-row')).toHaveCount(24)
  const scrollContainers = await page.locator('.workspace-content').evaluate(root =>
    [root, ...root.querySelectorAll('*')].filter(element => {
      const css = getComputedStyle(element)
      return /auto|scroll|hidden/.test(css.overflowY) && element.scrollHeight > element.clientHeight + 1
    }).map(element => element.className)
  )
  expect(scrollContainers).toEqual([])
})
