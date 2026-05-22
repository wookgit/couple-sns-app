import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Calendar from './Calendar';

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ empty: true })),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  increment: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()) // returns unsubscribe function
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: '123', displayName: '남욱', photoURL: 'test.jpg' }
  })
}));

describe('Calendar Page (Schedule)', () => {
  it('renders Calendar header, month navigator, and floating action button', () => {
    render(<Calendar />);
    
    expect(screen.getByText('Our Schedule')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /이전 달/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다음 달/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /일정 등록하기/i })).toBeInTheDocument();
  });
});
