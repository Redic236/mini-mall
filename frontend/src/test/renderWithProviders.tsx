import { ReactElement, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, type Reducer } from '@reduxjs/toolkit';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import authReducer from '@/store/slices/authSlice';

interface RenderOptionsWithRouter extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  preloadedAuth?: Partial<ReturnType<typeof authReducer>>;
}

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ['/'], preloadedAuth, ...renderOptions }: RenderOptionsWithRouter = {},
): RenderResult & { store: ReturnType<typeof makeStore> } {
  const store = makeStore(preloadedAuth);

  const Wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

function makeStore(preloadedAuth?: Partial<ReturnType<typeof authReducer>>) {
  return configureStore({
    reducer: { auth: authReducer as Reducer },
    preloadedState: preloadedAuth ? { auth: { ...emptyAuthState(), ...preloadedAuth } } : undefined,
  });
}

function emptyAuthState(): ReturnType<typeof authReducer> {
  return { user: null, token: null, loading: false, initialized: false };
}
