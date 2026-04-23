import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

// Mock the auth service so no HTTP is exercised.
vi.mock('@/services/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  fetchMe: vi.fn(),
}));

import * as authService from '@/services/auth';
import authReducer, {
  hydrateSession,
  loginThunk,
  logout,
  registerThunk,
} from './authSlice';
import { clearAuth, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '@/services/tokenStore';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

const sampleUser = { id: 1, username: 'alice', email: 'a@b.c', avatar: null, role: 'user' as const };

describe('authSlice', () => {
  beforeEach(() => {
    clearAuth();
  });

  describe('loginThunk', () => {
    it('persists token and user on fulfilled and updates state', async () => {
      vi.mocked(authService.login).mockResolvedValue({ user: sampleUser, token: 'new-token' });
      const store = makeStore();
      await store.dispatch(loginThunk({ email: 'a@b.c', password: 'pw' }));

      expect(store.getState().auth.user).toEqual(sampleUser);
      expect(store.getState().auth.token).toBe('new-token');
      expect(getStoredToken()).toBe('new-token');
      expect(getStoredUser()).toEqual(sampleUser);
    });

    it('toggles loading and does not persist on failure', async () => {
      vi.mocked(authService.login).mockRejectedValue(new Error('bad credentials'));
      const store = makeStore();
      await store.dispatch(loginThunk({ email: 'a@b.c', password: 'pw' }));

      expect(store.getState().auth.loading).toBe(false);
      expect(store.getState().auth.user).toBeNull();
      expect(getStoredToken()).toBeNull();
    });
  });

  describe('registerThunk', () => {
    it('persists on success', async () => {
      vi.mocked(authService.register).mockResolvedValue({ user: sampleUser, token: 't' });
      const store = makeStore();
      await store.dispatch(registerThunk({ username: 'alice', email: 'a@b.c', password: 'pw' }));
      expect(store.getState().auth.token).toBe('t');
      expect(getStoredToken()).toBe('t');
    });
  });

  describe('logout', () => {
    it('clears state and storage', () => {
      setStoredToken('t');
      setStoredUser(sampleUser);
      const store = makeStore();
      store.dispatch(logout());
      expect(store.getState().auth.user).toBeNull();
      expect(store.getState().auth.token).toBeNull();
      expect(getStoredToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('hydrateSession', () => {
    it('leaves state logged-out when no token is stored', async () => {
      const store = makeStore();
      await store.dispatch(hydrateSession());
      expect(store.getState().auth.initialized).toBe(true);
      expect(store.getState().auth.user).toBeNull();
      expect(vi.mocked(authService.fetchMe)).not.toHaveBeenCalled();
    });

    it('refreshes the user from /me when token is valid', async () => {
      setStoredToken('ok');
      vi.mocked(authService.fetchMe).mockResolvedValue(sampleUser);
      const store = makeStore();
      await store.dispatch(hydrateSession());
      expect(store.getState().auth.user).toEqual(sampleUser);
      expect(store.getState().auth.initialized).toBe(true);
    });

    it('clears storage when /me fails (stale token)', async () => {
      setStoredToken('stale');
      setStoredUser(sampleUser);
      vi.mocked(authService.fetchMe).mockRejectedValue(new Error('401'));
      const store = makeStore();
      await store.dispatch(hydrateSession());
      expect(store.getState().auth.user).toBeNull();
      expect(getStoredToken()).toBeNull();
    });
  });
});
