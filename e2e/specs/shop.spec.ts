import { expect, test } from '@playwright/test';

/**
 * Guest-browsable flows: list → search → filter → detail. No auth needed.
 * Relies on the seeded fixture products (E2E T-Shirt / Jeans / Sneakers).
 */
test.describe('Shop browsing', () => {
  test('home lists seeded fixture products', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '全部商品' })).toBeVisible();
    await expect(page.getByText('E2E T-Shirt')).toBeVisible();
    await expect(page.getByText('E2E Jeans')).toBeVisible();
    await expect(page.getByText('E2E Sneakers')).toBeVisible();
  });

  test('keyword search filters the product grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('E2E Sneakers')).toBeVisible();

    const search = page.getByPlaceholder('搜索商品名称或描述');
    await search.fill('Sneakers');

    // Debounced 300ms; give the list a beat to refresh.
    await expect(page.getByText('E2E Sneakers')).toBeVisible();
    await expect(page.getByText('E2E T-Shirt')).toHaveCount(0);
  });

  test('category filter narrows to footwear', async ({ page }) => {
    await page.goto('/');
    // Segmented labels include counts, e.g. "鞋履 (1)".
    await page.getByText(/^鞋履/).first().click();
    await expect(page.getByText('E2E Sneakers')).toBeVisible();
    await expect(page.getByText('E2E T-Shirt')).toHaveCount(0);
  });

  test('product detail page renders', async ({ page }) => {
    await page.goto('/');
    await page.getByText('E2E T-Shirt').first().click();
    await expect(page).toHaveURL(/\/products\/\d+/);
    await expect(page.getByRole('heading', { name: 'E2E T-Shirt' })).toBeVisible();
    await expect(page.getByText('加入购物车')).toBeVisible();
  });
});
