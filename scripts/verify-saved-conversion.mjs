import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const baseURL = process.env.REVIEW_URL || 'http://127.0.0.1:5174'
const original = {
  id: 'conversion-deployment-check', name: '저장 검증 식빵', category: 'bread', productType: 'bread',
  tags: [], difficulty: 'beginner', servings: 1, totalTime: 30,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', method: 'straight',
  ingredients: [
    { id: 'flour', name: '강력분', amount: 500, category: 'flour', unit: 'g' },
    { id: 'water', name: '물', amount: 300, category: 'liquid', unit: 'g' },
  ],
  steps: [{ id: 'mix', order: 1, instruction: '재료를 섞는다', time: 5, temp: 26 }],
}
const browser = await chromium.launch()
try {
  // 별도 브라우저 컨텍스트에만 검증 데이터를 넣어 실제 사용자 저장본을 보존한다.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(recipe => {
    if (localStorage.getItem('saved-conversion-check')) return
    localStorage.setItem('saved-conversion-check', 'yes')
    localStorage.setItem('recipe-store', JSON.stringify({ version: 3, state: {
      recipes: [recipe], filters: { category: [], tags: [], difficulty: [], searchQuery: '' }, sortBy: 'name',
    } }))
  }, original)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${baseURL}/#recipes`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /저장 검증 식빵/ }).click()
  await page.getByRole('button', { name: '레시피 변환', exact: true }).click()
  await page.locator('.workspace-tabs').getByRole('button', { name: '변환 설정' }).click()
  await page.getByRole('button', { name: '자동', exact: true }).click()
  await page.getByRole('button', { name: '×2', exact: true }).click()
  await page.locator('.workspace-settings').getByRole('button', { name: '제법', exact: true }).click()
  await page.locator('.workspace-settings').getByRole('button', { name: '폴리시', exact: true }).click()
  await page.locator('.workspace-heading').getByRole('button', { name: '변환본 저장' }).click()
  const sheet = page.locator('.saved-weighing-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('폴리시')
  await expect(sheet).toContainText('본반죽')
  const readRecipes = () => page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')).state.recipes)
  const saved = await readRecipes()
  expect(saved).toHaveLength(2)
  expect(saved[0]).toEqual(original)
  expect(saved[1].ingredients.map(ingredient => ingredient.amount)).toEqual([300, 300, 700, 300])
  await page.getByRole('checkbox', { name: '강력분 계량 완료' }).first().check()
  await expect(page.getByRole('checkbox', { name: '강력분 계량 완료' }).first()).toBeChecked()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: '변환 설정 수정', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: '강력분 g', exact: true })).toHaveValue('500')
  await page.locator('.workspace-heading').getByRole('button', { name: '변환본 저장' }).click()
  await expect(sheet).toBeVisible()
  const updated = await readRecipes()
  expect(updated).toHaveLength(2)
  expect(updated[0]).toEqual(original)
  expect(updated[1].ingredients).toEqual(saved[1].ingredients)
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 30000 }).toBe(true)
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(sheet).toBeVisible()
  await expect(page.locator('.saved-instructions')).toContainText('재료를 섞는다')
  await mkdir('.review-shots', { recursive: true })
  await page.screenshot({ path: '.review-shots/verified-conversion-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: '.review-shots/verified-conversion-desktop.png', fullPage: true })
  await page.getByRole('button', { name: '변환 설정 수정', exact: true }).click()
  await page.getByRole('button', { name: '전문가', exact: true }).click()
  await page.locator('.workspace-actions summary').click()
  await page.getByTitle('변환 설정 전체 초기화 (원본 레시피는 유지)', { exact: true }).click()
  await expect(page.locator('.workspace-result')).toHaveCount(0)
  await expect(page.getByRole('spinbutton', { name: '강력분 g', exact: true })).toHaveValue('500')
  await expect(page.locator('.workspace-controls input[type="text"]')).toHaveValue('1')
  await page.screenshot({ path: '.review-shots/verified-reset-desktop.png', fullPage: true })
  await page.getByRole('button', { name: '되돌리기', exact: true }).click()
  await expect(page.locator('.workspace-result')).toContainText('폴리시')
  await expect(page.locator('.workspace-controls input[type="text"]')).toHaveValue('2')
  expect(await readRecipes()).toEqual(updated)
  expect(errors).toEqual([])
  console.log(JSON.stringify({ baseURL, original: 'preserved', poolishAmounts: [300, 300, 700, 300],
    editAgain: 'no double scaling', offlineReload: 'passed', resetAndUndo: 'passed', pageErrors: errors }, null, 2))
} finally {
  await browser.close()
}
