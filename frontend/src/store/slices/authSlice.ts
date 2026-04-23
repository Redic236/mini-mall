import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchMe,
  login as loginRequest,
  register as registerRequest,
  type LoginInput,
  type RegisterInput,
} from '@/services/auth';
import {
  clearAuth,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from '@/services/tokenStore';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
}

const initialState: AuthState = {
  user: getStoredUser(),
  token: getStoredToken(),
  loading: false,
  initialized: false,
};

export const loginThunk = createAsyncThunk('auth/login', async (input: LoginInput) => {
  const result = await loginRequest(input);
  setStoredToken(result.token);
  setStoredUser(result.user);
  return result;
});

export const registerThunk = createAsyncThunk('auth/register', async (input: RegisterInput) => {
  const result = await registerRequest(input);
  setStoredToken(result.token);
  setStoredUser(result.user);
  return result;
});

// Validates the persisted token against /auth/me on app boot. If it fails,
// clears local storage — user will be treated as logged out.
export const hydrateSession = createAsyncThunk('auth/hydrate', async () => {
  if (!getStoredToken()) return null;
  try {
    const user = await fetchMe();
    setStoredUser(user);
    return user;
  } catch {
    clearAuth();
    return null;
  }
});

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      clearAuth();
      state.user = null;
      state.token = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginThunk.rejected, (state) => {
        state.loading = false;
      })
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerThunk.rejected, (state) => {
        state.loading = false;
      })
      .addCase(hydrateSession.fulfilled, (state, action) => {
        state.initialized = true;
        if (action.payload) {
          state.user = action.payload;
        } else {
          state.user = null;
          state.token = null;
        }
      })
      .addCase(hydrateSession.rejected, (state) => {
        state.initialized = true;
        state.user = null;
        state.token = null;
      });
  },
});

export const { logout } = slice.actions;
export default slice.reducer;
