import { describe, it, expect, vi } from 'vitest';
import {
  clearAuth,
  getStoredToken,
  getStoredUser,
  notifyUnauthorized,
  onUnauthorized,
  setStoredToken,
  setStoredUser,
} from './tokenStore';

describe('tokenStore', () => {
  describe('token persistence', () => {
    it('round-trips a token through localStorage', () => {
      expect(getStoredToken()).toBeNull();
      setStoredToken('abc123');
      expect(getStoredToken()).toBe('abc123');
    });

    it('removes the token when set to null', () => {
      setStoredToken('abc123');
      setStoredToken(null);
      expect(getStoredToken()).toBeNull();
    });
  });

  describe('user persistence', () => {
    const user = { id: 1, username: 'a', email: 'a@b.c', avatar: null, role: 'user' as const };

    it('round-trips a user', () => {
      setStoredUser(user);
      expect(getStoredUser()).toEqual(user);
    });

    it('returns null when no user stored', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('returns null when stored value is not valid JSON', () => {
      localStorage.setItem('mini-mall.user', '{not json');
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('removes both token and user', () => {
      setStoredToken('t');
      setStoredUser({ id: 1, username: 'a', email: 'a@b.c', avatar: null, role: 'user' });
      clearAuth();
      expect(getStoredToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('onUnauthorized', () => {
    it('invokes the registered handler when notifyUnauthorized is called', () => {
      const handler = vi.fn();
      const off = onUnauthorized(handler);
      notifyUnauthorized();
      expect(handler).toHaveBeenCalledTimes(1);
      off();
      notifyUnauthorized();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('only keeps the most recently registered handler', () => {
      const first = vi.fn();
      const second = vi.fn();
      onUnauthorized(first);
      onUnauthorized(second);
      notifyUnauthorized();
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });
  });
});
