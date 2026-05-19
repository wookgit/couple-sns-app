import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Home from './Home';

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
  storage: {}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()) // returns unsubscribe function
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: '123', displayName: '남욱', photoURL: 'test.jpg' }
  })
}));

describe('Home Page (Timeline)', () => {
  it('renders Timeline header and floating action button', () => {
    render(<Home />);
    
    expect(screen.getByText('Our Moments')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /추억 기록하기/i })).toBeInTheDocument();
  });
});
