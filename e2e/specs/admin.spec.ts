import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, register, uniqueCreds } from '../helpers/api';
import { seedAuthStorage } from '../helpers/session';

/**
 * Admin dashboard smoke test. Confirms role gating blocks regular users and
 * that the three admin pages render for the seeded admin fixture.
 */
test.describe('Admin', () => {
  test('regular users see a 403 on /admin', async ({ page, request }) => {
    const creds = uniqueCreds('notadmin');
    const { token, user } = await register(request, creds);
    await seedAuthStorage(page, token, user);

    await page.goto('/admin');
    await expect(page.getByText(/需要管理员权限/)).toBeVisible();
  });

  test('admin lands on the dashboard and can navigate', async ({ page, request }) => {
    const session = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await seedAuthStorage(page, session.token, session.user);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: '总览' })).toBeVisible();
    await expect(page.getByText('商品总数')).toBeVisible();

    await page.getByRole('menuitem', { name: '订单管理' }).click();
    await expect(page.getByRole('heading', { name: '订单管理' })).toBeVisible();

    await page.getByRole('menuitem', { name: '商品管理' }).click();
    await expect(page.getByRole('heading', { name: '商品管理' })).toBeVisible();
    // Admin products page orders by id DESC — with 23 seeded rows the named
    // fixtures (ids 1-3) are on page 2; assert on a filler that's guaranteed
    // to sit on page 1.
    await expect(page.getByText('E2E Filler 20')).toBeVisible();
  });

  test('admin can create and delete a product', async ({ page, request }) => {
    const session = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await seedAuthStorage(page, session.token, session.user);

    await page.goto('/admin/products');
    await page.getByRole('button', { name: /新\s*增\s*商\s*品/ }).click();

    // Drawer renders in a portal — wait for it before filling.
    const drawer = page.locator('.ant-drawer-content');
    await expect(drawer).toBeVisible();

    const unique = `E2E-Dynamic-${Date.now()}`;
    await drawer.getByLabel('名称').fill(unique);
    await drawer.getByLabel('价格（元）').fill('99');
    await drawer.getByLabel('分类').fill('测试');
    await drawer.getByLabel('库存').fill('25');
    await drawer.getByRole('button', { name: /保\s*存/ }).click();

    await expect(page.getByText(unique)).toBeVisible();

    // Locate the row for this product and delete it.
    const row = page.locator('.ant-table-row', { hasText: unique });
    await row.getByRole('button', { name: /删\s*除/ }).click();
    await page.getByRole('button', { name: /确\s*定/ }).click();

    await expect(page.getByText(unique)).toHaveCount(0);
  });
});
