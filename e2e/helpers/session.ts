import type { Page } from '@playwright/test';

interface StoredUser {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
}

/**
 * The frontend persists its auth session in localStorage under these two keys
 * (see frontend/src/services/auth.ts). Seeding them via addInitScript before
 * navigation lets specs jump past the login screen without retyping forms.
 */
export async function seedAuthStorage(
  page: Page,
  token: string,
  user: StoredUser,
): Promise<void> {
  // Keys must match frontend/src/services/tokenStore.ts.
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('mini-mall.token', token);
      localStorage.setItem('mini-mall.user', JSON.stringify(user));
    },
    { token, user },
  );
}
