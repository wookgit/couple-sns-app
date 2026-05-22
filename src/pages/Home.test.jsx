import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Home from './Home';

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
  storage: {}
}));

// Capture onSnapshot callbacks
let snapshotCallbackUsers;
let snapshotCallbackNotifications;
let snapshotCallbackPosts;

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
  onSnapshot: vi.fn((q, callback) => {
    // Determine which subscription this is based on query or collection structure
    // Since mock collection queries are passed, we can detect users, notifications or posts
    // For simplicity, we just save the callback in order or inspect arguments
    const qStr = q ? q.toString() : '';
    if (snapshotCallbackUsers === undefined) {
      snapshotCallbackUsers = callback;
    } else if (snapshotCallbackNotifications === undefined) {
      snapshotCallbackNotifications = callback;
    } else {
      snapshotCallbackPosts = callback;
    }
    return vi.fn(); // returns unsubscribe function
  })
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

  it('renders posts with multiple images and individual heart buttons', async () => {
    render(<Home />);
    
    // Trigger users snapshot to avoid empty users logs
    if (snapshotCallbackUsers) {
      act(() => {
        snapshotCallbackUsers({
          forEach: (cb) => {
            cb({
              id: '123',
              data: () => ({ displayName: '남욱', photoURL: 'test.jpg' })
            });
          }
        });
      });
    }

    // Trigger posts snapshot callback with mock posts
    const mockDocs = [
      {
        id: 'post-1',
        data: () => ({
          text: '커플 여행 사진 💖',
          images: [
            { url: 'data:image/jpeg;base64,test1', likedBy: ['123'], hearts: 1 },
            { url: 'data:image/jpeg;base64,test2', likedBy: [], hearts: 0 }
          ],
          authorName: '남욱',
          authorPhoto: 'test.jpg',
          authorUid: '123',
          createdAt: new Date().toISOString(),
          hearts: 1,
          likedBy: ['123'],
          comments: []
        })
      }
    ];

    if (snapshotCallbackPosts) {
      await act(async () => {
        snapshotCallbackPosts({
          docs: mockDocs
        });
      });
    }

    // Assert images and like buttons are rendered
    expect(screen.getByText('커플 여행 사진 💖')).toBeInTheDocument();
    const imageLikeBtns = screen.getAllByLabelText('사진 좋아요');
    expect(imageLikeBtns).toHaveLength(2);
    expect(screen.getAllByText('1')[0]).toBeInTheDocument(); // hearts count of first image
  });
});
