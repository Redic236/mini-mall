import { expect, test } from '@playwright/test';
import { uniqueCreds } from '../helpers/api';

/**
 * Full auth loop: register via UI → auto-login → reload preserves session →
 * dropdown logout → redirected to login page.
 */
test.describe('Auth', () => {
  test('register → see home as logged-in user → reload preserves session → logout', async ({ page }) => {
    const creds = uniqueCreds('auth');

    await page.goto('/register');
    await page.getByRole('textbox', { name: '用户名' }).fill(creds.username);
    await page.getByRole('textbox', { name: '邮箱' }).fill(creds.email);
    await page.getByLabel('密码').fill(creds.password);
    // Scope to the form area — the header also has a "注册" button.
    await page.getByRole('main').getByRole('button', { name: /注\s*册/ }).click();

    // Home renders after successful register (productSlice loads products).
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: '全部商品' })).toBeVisible();
    // Header no longer shows its login button — the user dropdown is there instead.
    await expect(page.getByRole('banner').getByRole('button', { name: /登\s*录/ })).toHaveCount(0);

    // Session survives a full reload.
    await page.reload();
    await expect(page.getByRole('banner').getByRole('button', { name: /登\s*录/ })).toHaveCount(0);

    // Logout path: open user dropdown → 退出登录 → redirected to /login.
    // AntD dropdown is hover-triggered; click the avatar area to toggle.
    await page.locator('.ant-avatar').first().click();
    await page.getByText('退出登录').click();

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('main').getByRole('button', { name: /登\s*录/ })).toBeVisible();
  });

  test('login with wrong password stays on the login page', async ({ page, request }) => {
    // Arrange a real account, but intentionally submit the wrong password.
    const creds = uniqueCreds('auth-bad');
    await request.post('http://localhost:3001/api/auth/register', { data: creds });

    await page.goto('/login');
    await page.getByRole('textbox', { name: '邮箱' }).fill(creds.email);
    await page.getByLabel('密码').fill('wrong-password');
    await page.getByRole('main').getByRole('button', { name: /登\s*录/ }).click();

    // Server rejects with 401 → frontend toast, URL unchanged.
    await expect(page).toHaveURL(/\/login/);
  });
});
