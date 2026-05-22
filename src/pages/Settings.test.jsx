import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Settings from './Settings';

// Mock Firebase
vi.mock('../firebase', () => ({
  auth: {
    signOut: vi.fn()
  },
  db: {}
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: '123', displayName: '남욱', email: 'namwook@example.com', photoURL: 'test.jpg' }
  })
}));

describe('Settings Page', () => {
  it('renders Settings header, profile card, and actions', () => {
    render(<Settings />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('남욱')).toBeInTheDocument();
    expect(screen.getByText('namwook@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /로그아웃/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /연동 코드 생성/i })).toBeInTheDocument();
  });
});
