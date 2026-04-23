import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import Login from './Login';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/services/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  fetchMe: vi.fn(),
}));

import * as authService from '@/services/auth';

function HomeStub(): JSX.Element {
  return <div data-testid="home">home</div>;
}

function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeStub />} />
    </Routes>
  );
}

const user = { id: 1, username: 'alice', email: 'alice@example.com', avatar: null, role: 'user' as const };

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls authService.login and redirects on success', async () => {
    vi.mocked(authService.login).mockResolvedValue({ user, token: 'tk' });

    renderWithProviders(<App />, { initialEntries: ['/login'] });

    const userEv = userEvent.setup();
    await userEv.type(screen.getByLabelText('邮箱'), 'alice@example.com');
    await userEv.type(screen.getByLabelText('密码'), 'password123');
    await userEv.click(screen.getByRole('button', { name: /登\s*录/ }));

    expect(authService.login).toHaveBeenCalledWith({
      email: 'alice@example.com',
      password: 'password123',
    });
    // After success we navigate to the redirect target (default '/').
    expect(await screen.findByTestId('home')).toBeInTheDocument();
  });

  it('stays on /login when credentials are rejected', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('bad creds'));

    renderWithProviders(<App />, { initialEntries: ['/login'] });

    const userEv = userEvent.setup();
    await userEv.type(screen.getByLabelText('邮箱'), 'alice@example.com');
    await userEv.type(screen.getByLabelText('密码'), 'wrong');
    await userEv.click(screen.getByRole('button', { name: /登\s*录/ }));

    expect(authService.login).toHaveBeenCalled();
    // Home was never rendered — the app stayed on the login form.
    expect(screen.queryByTestId('home')).not.toBeInTheDocument();
  });

  it('honors the ?redirect= parameter on success', async () => {
    vi.mocked(authService.login).mockResolvedValue({ user, token: 'tk' });

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<div data-testid="cart">cart</div>} />
      </Routes>,
      { initialEntries: ['/login?redirect=%2Fcart'] },
    );

    const userEv = userEvent.setup();
    await userEv.type(screen.getByLabelText('邮箱'), 'alice@example.com');
    await userEv.type(screen.getByLabelText('密码'), 'password123');
    await userEv.click(screen.getByRole('button', { name: /登\s*录/ }));

    expect(await screen.findByTestId('cart')).toBeInTheDocument();
  });
});
