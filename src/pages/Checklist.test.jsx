import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Checklist from './Checklist';

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {}
}));

// Capture callbacks
let snapshotCallbackUsers;
let snapshotCallbackChecklists;

// Mock Firestore functions
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  doc: vi.fn((db, col, id) => id),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  onSnapshot: vi.fn((q, callback) => {
    if (snapshotCallbackUsers === undefined) {
      snapshotCallbackUsers = callback;
    } else {
      snapshotCallbackChecklists = callback;
    }
    return vi.fn(); // returns unsubscribe mock
  })
}));

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', partnerUid: 'user-2', displayName: '남욱', partnerName: '지현' }
  })
}));

// Mock CustomAlertContext
const mockAlert = vi.fn(() => Promise.resolve());
const mockConfirm = vi.fn(() => Promise.resolve(true));
vi.mock('../context/CustomAlertContext', () => ({
  useAlert: () => ({
    alert: mockAlert,
    confirm: mockConfirm
  })
}));

// Mock Notification Service
vi.mock('../services/notificationService', () => ({
  sendNotification: vi.fn()
}));

// Select Helpers
const getSortSelect = (container) => container.querySelector('.checklist-sort-select');
const getFormPrioritySelect = (container) => container.querySelector('.checklist-form select.checklist-status-select');
const getTabButtons = (container) => container.querySelectorAll('.checklist-tab-btn');
const getCardPrioritySelect = (container) => {
  const selects = container.querySelectorAll('.checklist-card select.checklist-status-select');
  for (const select of selects) {
    if (select.querySelector('option[value="3"]')) {
      return select;
    }
  }
  return null;
};

describe('Checklist Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshotCallbackUsers = undefined;
    snapshotCallbackChecklists = undefined;
  });

  const loadMockUsers = () => {
    if (snapshotCallbackUsers) {
      act(() => {
        snapshotCallbackUsers({
          forEach: (cb) => {
            cb({
              id: 'user-1',
              data: () => ({ displayName: '남욱', photoURL: 'namwook.jpg' })
            });
            cb({
              id: 'user-2',
              data: () => ({ displayName: '지현', photoURL: 'jihyun.jpg' })
            });
          }
        });
      });
    }
  };

  it('renders tabs and input form', () => {
    const { container } = render(<Checklist />);
    
    expect(screen.getByText('체크리스트 💖')).toBeInTheDocument();
    
    const tabs = getTabButtons(container);
    expect(tabs[0].textContent).toContain('전체');
    expect(tabs[1].textContent).toContain('미정');
    expect(tabs[2].textContent).toContain('진행중');
    expect(tabs[3].textContent).toContain('완료');
    
    expect(screen.getByPlaceholderText('서로 함께할 할 일을 입력해 보세요...')).toBeInTheDocument();
  });

  it('adds a new checklist item with selected priority', async () => {
    const { container } = render(<Checklist />);

    const input = screen.getByPlaceholderText('서로 함께할 할 일을 입력해 보세요...');
    const prioritySelect = getFormPrioritySelect(container);
    const addButton = screen.getByRole('button', { name: /추가/ });

    fireEvent.change(input, { target: { value: '제주도 비행기 티켓 예약 ✈️' } });
    fireEvent.change(prioritySelect, { target: { value: '3' } }); // 긴급 🔥
    fireEvent.click(addButton);

    expect(mockAddDoc).toHaveBeenCalled();
    const addArgs = mockAddDoc.mock.calls[0][1];
    expect(addArgs.title).toBe('제주도 비행기 티켓 예약 ✈️');
    expect(addArgs.status).toBe('pending');
    expect(addArgs.progressStage).toBe(0);
    expect(addArgs.priority).toBe(3); // 3 for 긴급
    expect(addArgs.authorUid).toBe('user-1');
  });

  it('renders checklists and handles 5-stage progress interaction', async () => {
    const { container } = render(<Checklist />);
    loadMockUsers();

    // Load mock checklist items via snapshot callback
    const mockItems = [
      {
        id: 'item-1',
        data: () => ({
          title: '숙소 예약하기 🏠',
          status: 'pending',
          progressStage: 0,
          priority: 2,
          authorUid: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      },
      {
        id: 'item-2',
        data: () => ({
          title: '렌트카 알아보기 🚗',
          status: 'progress',
          progressStage: 3, // 3단계 (60%)
          priority: 3,
          authorUid: 'user-2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    ];

    if (snapshotCallbackChecklists) {
      await act(async () => {
        snapshotCallbackChecklists({
          docs: mockItems
        });
      });
    }

    // Assert items rendered
    expect(screen.getByText('숙소 예약하기 🏠')).toBeInTheDocument();
    expect(screen.getByText('렌트카 알아보기 🚗')).toBeInTheDocument();
    
    // Assert 5-stage labels (stage 0 -> 미정 💤, stage 3 -> 절반 완료 🌗 (60%))
    expect(screen.getAllByText('미정 💤').length).toBeGreaterThan(0);
    expect(screen.getByText('절반 완료 🌗 (60%)')).toBeInTheDocument();

    const cards = container.querySelectorAll('.checklist-card');
    const accommodationCard = Array.from(cards).find(card => card.textContent.includes('숙소 예약하기 🏠'));
    const heartButtons = accommodationCard.querySelectorAll('.checklist-heart-btn');
    expect(heartButtons).toHaveLength(5);

    // Click 3rd heart of "숙소 예약하기 🏠" (index 2)
    fireEvent.click(heartButtons[2]);

    expect(mockUpdateDoc).toHaveBeenCalled();
    const updateArgs = mockUpdateDoc.mock.calls[0][1];
    expect(updateArgs.progressStage).toBe(3);
    expect(updateArgs.status).toBe('progress');
  });

  it('handles 5th stage selection to complete the item', async () => {
    const { container } = render(<Checklist />);
    loadMockUsers();

    const mockItems = [
      {
        id: 'item-1',
        data: () => ({
          title: '숙소 예약하기 🏠',
          status: 'pending',
          progressStage: 0,
          priority: 2,
          authorUid: 'user-1',
          createdAt: new Date().toISOString()
        })
      }
    ];

    if (snapshotCallbackChecklists) {
      await act(async () => {
        snapshotCallbackChecklists({
          docs: mockItems
        });
      });
    }

    const cards = container.querySelectorAll('.checklist-card');
    const accommodationCard = Array.from(cards).find(card => card.textContent.includes('숙소 예약하기 🏠'));
    const heartButtons = accommodationCard.querySelectorAll('.checklist-heart-btn');
    
    // Click 5th heart of item-1 (index 4)
    fireEvent.click(heartButtons[4]);

    expect(mockUpdateDoc).toHaveBeenCalled();
    const updateArgs = mockUpdateDoc.mock.calls[0][1];
    expect(updateArgs.progressStage).toBe(5);
    expect(updateArgs.status).toBe('completed');
  });

  it('filters items by status and priority correctly', async () => {
    render(<Checklist />);
    loadMockUsers();

    const mockItems = [
      {
        id: 'item-1',
        data: () => ({
          title: '긴급 대기 할일 🔴',
          status: 'pending',
          priority: 3,
          authorUid: 'user-1',
          createdAt: '2026-05-21T01:00:00.000Z'
        })
      },
      {
        id: 'item-2',
        data: () => ({
          title: '보통 대기 할일 🟡',
          status: 'pending',
          priority: 2,
          authorUid: 'user-1',
          createdAt: '2026-05-21T02:00:00.000Z'
        })
      },
      {
        id: 'item-3',
        data: () => ({
          title: '긴급 진행중 할일 🔵',
          status: 'progress',
          priority: 3,
          authorUid: 'user-2',
          createdAt: '2026-05-21T03:00:00.000Z'
        })
      }
    ];

    if (snapshotCallbackChecklists) {
      await act(async () => {
        snapshotCallbackChecklists({
          docs: mockItems
        });
      });
    }

    // 1. 초기에는 정렬/필터에 의해 3개 다 보여야 함
    expect(screen.getByText('긴급 대기 할일 🔴')).toBeInTheDocument();
    expect(screen.getByText('보통 대기 할일 🟡')).toBeInTheDocument();
    expect(screen.getByText('긴급 진행중 할일 🔵')).toBeInTheDocument();

    // 2. 중요도 '긴급' 필터 칩 클릭
    const urgentChip = screen.getByRole('button', { name: /🔥 긴급/ });
    fireEvent.click(urgentChip);

    // 긴급인 item-1, item-3만 보이고 보통인 item-2는 안 보여야 함
    expect(screen.getByText('긴급 대기 할일 🔴')).toBeInTheDocument();
    expect(screen.queryByText('보통 대기 할일 🟡')).not.toBeInTheDocument();
    expect(screen.getByText('긴급 진행중 할일 🔵')).toBeInTheDocument();

    // 3. 탭을 '미정'으로 필터링
    const pendingTab = screen.getByRole('button', { name: /미정/ });
    fireEvent.click(pendingTab);

    // 미정 탭 + 긴급 필터: item-1만 보여야 함
    expect(screen.getByText('긴급 대기 할일 🔴')).toBeInTheDocument();
    expect(screen.queryByText('보통 대기 할일 🟡')).not.toBeInTheDocument();
    expect(screen.queryByText('긴급 진행중 할일 🔵')).not.toBeInTheDocument();
  });

  it('sorts items by priority (1st: priority, 2nd: newest) and by newest correctly', async () => {
    const { container } = render(<Checklist />);
    loadMockUsers();

    // 3개 아이템:
    // A: 낮음(1), 작성일: 2026-05-21T10:00:00
    // B: 긴급(3), 작성일: 2026-05-21T09:00:00
    // C: 긴급(3), 작성일: 2026-05-21T11:00:00 (C가 B보다 최신)
    const mockItems = [
      {
        id: 'item-a',
        data: () => ({
          title: '낮음 할일 🌱',
          status: 'pending',
          priority: 1,
          authorUid: 'user-1',
          createdAt: '2026-05-21T10:00:00.000Z'
        })
      },
      {
        id: 'item-b',
        data: () => ({
          title: '긴급 예전 할일 🔥',
          status: 'pending',
          priority: 3,
          authorUid: 'user-1',
          createdAt: '2026-05-21T09:00:00.000Z'
        })
      },
      {
        id: 'item-c',
        data: () => ({
          title: '긴급 최신 할일 🔥',
          status: 'pending',
          priority: 3,
          authorUid: 'user-1',
          createdAt: '2026-05-21T11:00:00.000Z'
        })
      }
    ];

    if (snapshotCallbackChecklists) {
      await act(async () => {
        snapshotCallbackChecklists({
          docs: mockItems
        });
      });
    }

    // 기본 정렬: 중요도순
    // 긴급(3)이 먼저 오고, 그 중 최신이 먼저 옴. 따라서 C -> B -> A 순서여야 함.
    let cards = screen.getAllByText(/할일/);
    expect(cards[0].textContent).toBe('긴급 최신 할일 🔥');
    expect(cards[1].textContent).toBe('긴급 예전 할일 🔥');
    expect(cards[2].textContent).toBe('낮음 할일 🌱');

    // 정렬 방식을 최신순(newest)으로 변경
    const sortSelect = getSortSelect(container);
    fireEvent.change(sortSelect, { target: { value: 'newest' } });

    // 최신순 정렬: C(11시) -> A(10시) -> B(09시) 순서여야 함.
    cards = screen.getAllByText(/할일/);
    expect(cards[0].textContent).toBe('긴급 최신 할일 🔥');
    expect(cards[1].textContent).toBe('낮음 할일 🌱');
    expect(cards[2].textContent).toBe('긴급 예전 할일 🔥');
  });

  it('updates priority dynamically when dropdown is changed inside card', async () => {
    const { container } = render(<Checklist />);
    loadMockUsers();

    const mockItems = [
      {
        id: 'item-1',
        data: () => ({
          title: '중요도 변경 테스트 할일',
          status: 'pending',
          priority: 2, // 보통
          authorUid: 'user-1',
          createdAt: new Date().toISOString()
        })
      }
    ];

    if (snapshotCallbackChecklists) {
      await act(async () => {
        snapshotCallbackChecklists({
          docs: mockItems
        });
      });
    }

    const cardPrioritySelect = getCardPrioritySelect(container);
    expect(cardPrioritySelect).toBeInTheDocument();

    // 중요도를 긴급(3)으로 변경
    fireEvent.change(cardPrioritySelect, { target: { value: '3' } });

    expect(mockUpdateDoc).toHaveBeenCalled();
    const updateArgs = mockUpdateDoc.mock.calls[0][1];
    expect(updateArgs.priority).toBe(3);
    expect(updateArgs.updatedAt).toBeDefined();
  });
});
