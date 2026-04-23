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

  test('pagination navigates between pages and reflects in the URL', async ({ page }) => {
    await page.goto('/');
    // Seed ships 3 named + 20 filler = 23 products. Default page size is 20,
    // so page 1 has 20 rows and a <Pagination> appears because total > limit.
    await expect(page.getByText('E2E T-Shirt')).toBeVisible();
    // One of the last filler rows should be on page 2.
    await expect(page.getByText('E2E Filler 20')).toHaveCount(0);

    // AntD Pagination exposes pages as `Page N` accessible-name buttons.
    const page2Button = page.locator('.ant-pagination .ant-pagination-item').getByText('2');
    await expect(page2Button).toBeVisible();
    await page2Button.click();

    await expect(page).toHaveURL(/[?&]page=2\b/);
    await expect(page.getByText('E2E Filler 20')).toBeVisible();
    // The named top-3 sit at the very start, so they're NOT on page 2.
    await expect(page.getByText('E2E T-Shirt')).toHaveCount(0);
  });

  test('resets to page 1 when a filter changes', async ({ page }) => {
    await page.goto('/?page=2');
    await expect(page.getByText('E2E Filler 20')).toBeVisible();

    // Pick a category segment — should zero the page param and land on page 1.
    await page.getByText(/^鞋履/).first().click();
    await expect(page).not.toHaveURL(/[?&]page=\d/);
    await expect(page.getByText('E2E Sneakers')).toBeVisible();
    // Filler products are in 填充 category, so they disappear.
    await expect(page.getByText('E2E Filler 01')).toHaveCount(0);
  });

  test('invalid product id renders the 404 result instead of hanging skeleton', async ({ page }) => {
    await page.goto('/products/abc');
    await expect(page.getByText('商品不存在')).toBeVisible();
    await expect(page.getByRole('button', { name: /返\s*回\s*首\s*页/ })).toBeVisible();
  });
});
