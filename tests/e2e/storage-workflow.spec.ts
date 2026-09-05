import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const source = {
  id: 'storage-source', name: '저장 점검 식빵', category: 'bread', productType: 'bread', tags: [],
  difficulty: 'beginner', servings: 1, totalTime: 30, createdAt: '2026-09-01', updatedAt: '2026-09-01', method: 'straight',
  ingredients: [{ id: 'flour', name: '강력분', amount: 500, category: 'flour', unit: 'g' },
    { id: 'water', name: '물', amount: 300, category: 'liquid', unit: 'g' }], steps: [],
}

async function seed(page: Page, recipes: any[]) {
  await page.addInitScript(value => {
    if (localStorage.getItem('storage-test-seeded')) return
    localStorage.setItem('storage-test-seeded', 'yes')
    localStorage.setItem('recipe-store', JSON.stringify({ version: 3, state: {
      recipes: value, filters: { category: [], difficulty: [], searchQuery: '', tags: [] }, sortBy: 'name',
    } }))
  }, recipes)
}
async function openStorage(page: Page, mobile = false) {
  await page.goto('/#settings', { waitUntil: 'domcontentloaded' })
  if (mobile) await page.getByLabel('설정 항목').selectOption('storage')
  else await page.getByRole('button', { name: /저장소/ }).click()
  await expect(page.getByRole('heading', { name: '이 기기에 저장됩니다' })).toBeVisible()
}

test('PC 백업 파일을 독립된 휴대폰 브라우저로 가져와 변환 설정까지 복원한다', async ({ page, context, browser, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seed(page, [source])
  await page.goto('/#recipes', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /저장 점검 식빵/ }).click()
  await page.getByRole('button', { name: '레시피 변환', exact: true }).click()
  await page.getByRole('button', { name: '자동', exact: true }).click()
  await page.getByRole('button', { name: '×2', exact: true }).click()
  await page.locator('.workspace-tools').getByRole('button', { name: '변환본 저장', exact: true }).first().click()
  await expect(page.locator('.saved-weighing-sheet')).toContainText('1000')
  await openStorage(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'JSON 내보내기', exact: true }).click()
  const download = await downloadPromise
  const backup = await readFile((await download.path())!)
  expect(JSON.parse(backup.toString())).toHaveLength(2)
  const phoneContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
  try {
    const phone = await phoneContext.newPage()
    await seed(phone, [])
    await openStorage(phone, true)
    expect(await phone.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes)).toEqual([])
    await phone.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup })
    await expect(phone.getByText('2개 추가, 0개 중복 또는 잘못된 항목 건너뜀. 기존 레시피는 유지됩니다.', { exact: true })).toBeVisible()
    await phone.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup })
    await expect(phone.getByText('0개 추가, 2개 중복 또는 잘못된 항목 건너뜀. 기존 레시피는 유지됩니다.', { exact: true })).toBeVisible()
    expect(await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    await phone.screenshot({ path: '.review-shots/storage-mobile.png', fullPage: true })
    await phone.goto('/#recipes', { waitUntil: 'domcontentloaded' })
    await phone.getByRole('button', { name: /저장 점검 식빵 · ×2/ }).click()
    await expect(phone.locator('.saved-weighing-sheet')).toContainText('1000')
    await phone.reload()
    await expect(phone.locator('.saved-weighing-sheet')).toContainText('1000')
    await phone.getByRole('button', { name: '변환 설정 수정', exact: true }).click()
    await expect(phone.getByRole('spinbutton', { name: '강력분 g', exact: true })).toHaveValue('500')
    for (const name of ['재료 입력', '변환 설정', '계량 결과', '공정·메모']) {
      await phone.locator('.workspace-tabs').getByRole('button', { name }).click()
      await expect(phone.locator('.workspace-heading').getByRole('button', { name: '변환본 저장' })).toBeVisible()
    }
    await phone.locator('.workspace-heading').getByRole('button', { name: '변환본 저장' }).click()
    await expect(phone.locator('.saved-weighing-sheet')).toContainText('1000')
    expect(await phone.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes.length)).toBe(2)
  } finally { await phoneContext.close() }
  await page.screenshot({ path: '.review-shots/storage-desktop.png', fullPage: true })
})

test('휴대폰에서 저장 한도 초과로 가져오기가 실패하면 성공 안내를 띄우지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seed(page, [source])
  await openStorage(page, true)
  await page.evaluate(() => {
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key === 'recipe-store') throw new DOMException('full', 'QuotaExceededError')
      return write.call(this, key, value)
    }
  })
  await page.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{ ...source, id: 'new-recipe' }])) })
  await expect(page.getByRole('alert').filter({ hasText: '브라우저에 저장하지 못했습니다' }).first()).toBeVisible()
  await expect(page.getByText(/1개 추가/)).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('recipe-store')!).state.recipes.length)).toBe(1)
})
