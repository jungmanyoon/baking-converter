import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import recipes from '../src/data/sampleRecipes.js'

const baseURL = process.env.REVIEW_URL || 'http://127.0.0.1:5174'
const recipe = recipes.find(recipe => recipe.id === 'hoyatv-greentea-roll-cake')
const browser = await chromium.launch()
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(recipe => {
    if (localStorage.getItem('deployment-check')) return
    localStorage.setItem('deployment-check', 'yes')
    localStorage.setItem('recipe-store', JSON.stringify({ version: 3, state: {
      recipes: [recipe], filters: { category: [], tags: [], difficulty: [], searchQuery: '' }, sortBy: 'name',
    } }))
  }, recipe)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${baseURL}/#recipes`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /녹차 롤케이크/ }).click()
  await page.getByRole('button', { name: '레시피 변환', exact: true }).click()
  await expect(page.locator('.workspace-original .ingredient-row')).toHaveCount(9)
  const table = await page.locator('.workspace-original').evaluate(root => ({
    bottom: root.getBoundingClientRect().bottom,
    viewport: innerHeight,
    scrolls: [root, ...root.querySelectorAll('*')].filter(element => /auto|scroll|hidden/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1).length,
  }))
  expect(table.scrolls).toBe(0)
  expect(table.bottom).toBeLessThanOrEqual(table.viewport)
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 30000 }).toBe(true)
  const cacheKeys = await page.evaluate(() => caches.keys())
  expect(cacheKeys.some(key => key.includes('workbox-precache'))).toBe(true)
  await mkdir('.review-shots', { recursive: true })
  await page.screenshot({ path: '.review-shots/deployed-no-scroll.png' })
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.goto(`${baseURL}/#recipes`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: /녹차 롤케이크/ })).toBeVisible()
  await page.getByRole('button', { name: /녹차 롤케이크/ }).click()
  await page.getByRole('button', { name: '레시피 변환', exact: true }).click()
  await expect(page.locator('.workspace-original .ingredient-row')).toHaveCount(9)
  expect(errors).toEqual([])
  console.log(JSON.stringify({ baseURL, table, serviceWorker: 'controlled', precache: 'preserved', offlineReload: 'passed', pageErrors: errors }, null, 2))
} finally {
  await browser.close()
}
