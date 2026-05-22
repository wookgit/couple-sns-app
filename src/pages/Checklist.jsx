import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/CustomAlertContext';
import { sendNotification } from '../services/notificationService';
import { CheckSquare, Trash2, Edit3, Plus, Heart, Check, X } from 'lucide-react';

const Checklist = () => {
  const { user } = useAuth();
  const { alert, confirm } = useAlert();

  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'progress' | 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 3 | 2 | 1
  const [sortBy, setSortBy] = useState('priority'); // 'priority' (중요도순) | 'newest' (최신순)
  
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPriority, setNewItemPriority] = useState(2); // 기본값: 보통(2)
  const [userProfiles, setUserProfiles] = useState({});

  // 인라인 수정 상태
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // 1. 실시간 사용자 프로필 로딩 (작성자 아바타 및 커스텀 파트너명 매핑용)
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const profiles = {};
      snapshot.forEach((doc) => {
        profiles[doc.id] = doc.data();
      });
      setUserProfiles(profiles);
    });
    return () => unsubscribe();
  }, []);

  // 2. 실시간 체크리스트 데이터 로딩 (프라이빗 커플 필터링)
  useEffect(() => {
    if (!db || !user) return;

    const authors = user.partnerUid ? [user.uid, user.partnerUid] : [user.uid];
    const q = query(
      collection(db, 'checklists'),
      where('authorUid', 'in', authors)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setChecklists(items);
      setLoading(false);
    }, (error) => {
      console.error("Error loading checklists:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 파트너 닉네임 우선 반영 이름 반환 헬퍼
  const getDisplayName = (uid) => {
    if (uid === user.uid) {
      return userProfiles[uid]?.displayName || user.displayName || '나';
    }
    if (uid === user.partnerUid) {
      return user.partnerName || userProfiles[uid]?.displayName || '상대방';
    }
    return userProfiles[uid]?.displayName || '알 수 없음';
  };

  // 5단계 진행률 한글 레이블 헬퍼
  const getStageLabel = (stage) => {
    switch (stage) {
      case 0: return '미정 💤';
      case 1: return '시작 🚀 (20%)';
      case 2: return '기초 작업 📝 (40%)';
      case 3: return '절반 완료 🌗 (60%)';
      case 4: return '마무리 중 ✨ (80%)';
      case 5: return '완료! 💖 (100%)';
      default: return '미정 💤';
    }
  };

  // 중요도 한글 레이블 반환
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 3: return '🔥 긴급';
      case 2: return '⚡ 보통';
      case 1: return '🌱 낮음';
      default: return '⚡ 보통';
    }
  };

  // 할 일 등록
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    const title = newItemTitle.trim();
    const priority = newItemPriority;
    setNewItemTitle('');
    setNewItemPriority(2); // 기본값 보통으로 초기화

    try {
      await addDoc(collection(db, 'checklists'), {
        title,
        status: 'pending',
        progressStage: 0,
        priority,
        authorUid: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 상대방에게 실시간 알림 전송
      if (user.partnerUid) {
        await sendNotification(
          user,
          'checklist',
          '새로운 체크리스트 📝',
          `${user.displayName || '상대방'}님이 새로운 할 일 '${title}'(중요도: ${getPriorityLabel(priority)})을(를) 등록했습니다.`,
          '/checklist'
        );
      }
    } catch (err) {
      console.error("Error adding checklist item:", err);
      await alert("할 일 등록 중 오류가 발생했습니다.");
    }
  };

  // 할 일 삭제
  const handleDeleteItem = async (id, title) => {
    const confirmDelete = await confirm(`'${title}' 항목을 삭제하시겠습니까?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'checklists', id));

      if (user.partnerUid) {
        await sendNotification(
          user,
          'checklist',
          '체크리스트 삭제 🗑️',
          `${user.displayName || '상대방'}님이 할 일 '${title}'을(를) 삭제했습니다.`,
          '/checklist'
        );
      }
    } catch (err) {
      console.error("Error deleting checklist item:", err);
      await alert("할 일 삭제 중 오류가 발생했습니다.");
    }
  };

  // 인라인 수정 시작
  const handleStartEdit = (id, title) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  // 인라인 수정 저장
  const handleSaveEdit = async (id, item) => {
    if (!editingTitle.trim()) return;
    const oldTitle = item.title;
    const newTitle = editingTitle.trim();

    try {
      await updateDoc(doc(db, 'checklists', id), {
        title: newTitle,
        updatedAt: new Date().toISOString()
      });

      setEditingId(null);

      if (user.partnerUid && oldTitle !== newTitle) {
        await sendNotification(
          user,
          'checklist',
          '체크리스트 내용 수정 ✏️',
          `${user.displayName || '상대방'}님이 할 일 '${oldTitle}'을(를) '${newTitle}'(으)로 수정했습니다.`,
          '/checklist'
        );
      }
    } catch (err) {
      console.error("Error updating checklist title:", err);
      await alert("할 일 수정 중 오류가 발생했습니다.");
    }
  };

  // 상태 직접 변경
  const handleStatusChange = async (id, item, newStatus) => {
    let newStage = item.progressStage;
    if (newStatus === 'pending') {
      newStage = 0;
    } else if (newStatus === 'completed') {
      newStage = 5;
    } else if (newStatus === 'progress') {
      if (item.progressStage === 0 || item.progressStage === 5) {
        newStage = 1;
      }
    }

    try {
      await updateDoc(doc(db, 'checklists', id), {
        status: newStatus,
        progressStage: newStage,
        updatedAt: new Date().toISOString()
      });

      if (user.partnerUid) {
        const statusText = newStatus === 'pending' ? '미정' : newStatus === 'progress' ? '진행중' : '완료';
        await sendNotification(
          user,
          'checklist',
          '체크리스트 상태 변경 📝',
          `${user.displayName || '상대방'}님이 할 일 '${item.title}'의 상태를 [${statusText}]으로 변경했습니다.`,
          '/checklist'
        );
      }
    } catch (err) {
      console.error("Error updating checklist status:", err);
    }
  };

  // 중요도 실시간 변경
  const handlePriorityChange = async (id, item, newPriority) => {
    try {
      await updateDoc(doc(db, 'checklists', id), {
        priority: newPriority,
        updatedAt: new Date().toISOString()
      });

      if (user.partnerUid) {
        await sendNotification(
          user,
          'checklist',
          '체크리스트 중요도 변경 ⚡',
          `${user.displayName || '상대방'}님이 할 일 '${item.title}'의 중요도를 [${getPriorityLabel(newPriority)}]로 변경했습니다.`,
          '/checklist'
        );
      }
    } catch (err) {
      console.error("Error updating checklist priority:", err);
    }
  };

  // 5단계 세부 진행도 클릭
  const handleStageChange = async (id, item, clickedStage) => {
    let newStatus = item.status;
    let finalStage = clickedStage;

    if (item.progressStage === clickedStage) {
      finalStage = 0;
      newStatus = 'pending';
    } else {
      if (clickedStage === 5) {
        newStatus = 'completed';
      } else {
        newStatus = 'progress';
      }
    }

    try {
      await updateDoc(doc(db, 'checklists', id), {
        progressStage: finalStage,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      if (user.partnerUid) {
        const stageLabel = getStageLabel(finalStage);
        await sendNotification(
          user,
          'checklist',
          '체크리스트 진행도 변경 💖',
          `${user.displayName || '상대방'}님이 할 일 '${item.title}'의 진행 단계를 [${stageLabel}]으로 변경했습니다.`,
          '/checklist'
        );
      }
    } catch (err) {
      console.error("Error updating checklist stage:", err);
    }
  };

  // 상태 탭 카운트
  const countMap = {
    all: checklists.length,
    pending: checklists.filter(item => item.status === 'pending').length,
    progress: checklists.filter(item => item.status === 'progress').length,
    completed: checklists.filter(item => item.status === 'completed').length,
  };

  // 중요도 필터 칩 카운트
  const priorityCountMap = {
    all: checklists.length,
    high: checklists.filter(item => (item.priority || 2) === 3).length,
    medium: checklists.filter(item => (item.priority || 2) === 2).length,
    low: checklists.filter(item => (item.priority || 2) === 1).length,
  };

  // 복합 필터링 적용
  const filteredChecklists = checklists.filter((item) => {
    const statusMatch = activeTab === 'all' || item.status === activeTab;
    const priorityMatch = priorityFilter === 'all' || (item.priority || 2) === Number(priorityFilter);
    return statusMatch && priorityMatch;
  });

  // 정렬 적용
  const sortedChecklists = [...filteredChecklists];
  if (sortBy === 'priority') {
    // 1차: 중요도 내림차순(3 -> 2 -> 1), 2차: 최신순 내림차순
    sortedChecklists.sort((a, b) => {
      const prioA = a.priority || 2;
      const prioB = b.priority || 2;
      if (prioB !== prioA) {
        return prioB - prioA;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  } else {
    // 최신순 내림차순
    sortedChecklists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return (
    <div className="page-container">
      <div className="app-header">
        <h1 className="app-title">체크리스트 💖</h1>
        {/* 정렬 드롭다운 */}
        <select
          className="checklist-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="priority">정렬: 중요도순 🌟</option>
          <option value="newest">정렬: 최신순 ⏰</option>
        </select>
      </div>

      {/* 상태 필터 탭 */}
      <div className="checklist-tabs">
        <button
          className={`checklist-tab-btn tab-all ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          전체 <span className="checklist-tab-badge">{countMap.all}</span>
        </button>
        <button
          className={`checklist-tab-btn tab-pending ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          미정 <span className="checklist-tab-badge">{countMap.pending}</span>
        </button>
        <button
          className={`checklist-tab-btn tab-progress ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          진행중 <span className="checklist-tab-badge">{countMap.progress}</span>
        </button>
        <button
          className={`checklist-tab-btn tab-completed ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          완료 <span className="checklist-tab-badge">{countMap.completed}</span>
        </button>
      </div>

      {/* 중요도 필터 칩 */}
      <div className="checklist-priority-chips">
        <button
          className={`checklist-priority-chip ${priorityFilter === 'all' ? 'active' : ''}`}
          onClick={() => setPriorityFilter('all')}
        >
          중요도 전체 <span style={{ opacity: 0.7, fontSize: '10px' }}>{priorityCountMap.all}</span>
        </button>
        <button
          className={`checklist-priority-chip ${priorityFilter === 3 ? 'active' : ''}`}
          onClick={() => setPriorityFilter(3)}
        >
          🔥 긴급 <span style={{ opacity: 0.7, fontSize: '10px' }}>{priorityCountMap.high}</span>
        </button>
        <button
          className={`checklist-priority-chip ${priorityFilter === 2 ? 'active' : ''}`}
          onClick={() => setPriorityFilter(2)}
        >
          ⚡ 보통 <span style={{ opacity: 0.7, fontSize: '10px' }}>{priorityCountMap.medium}</span>
        </button>
        <button
          className={`checklist-priority-chip ${priorityFilter === 1 ? 'active' : ''}`}
          onClick={() => setPriorityFilter(1)}
        >
          🌱 낮음 <span style={{ opacity: 0.7, fontSize: '10px' }}>{priorityCountMap.low}</span>
        </button>
      </div>

      {/* 입력 폼 */}
      <div className="glass-card checklist-input-card">
        <form onSubmit={handleAddItem} className="checklist-form">
          <input
            type="text"
            className="checklist-input"
            placeholder="서로 함께할 할 일을 입력해 보세요..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
          />
          {/* 중요도 선택 드롭다운 */}
          <select
            className="checklist-status-select"
            style={{ marginRight: '6px', maxWidth: '75px', fontSize: '12px' }}
            value={newItemPriority}
            onChange={(e) => setNewItemPriority(Number(e.target.value))}
          >
            <option value={3}>🔥 긴급</option>
            <option value={2}>⚡ 보통</option>
            <option value={1}>🌱 낮음</option>
          </select>
          <button type="submit" className="checklist-add-btn" disabled={!newItemTitle.trim()}>
            <Plus size={18} />
            <span>추가</span>
          </button>
        </form>
      </div>

      {/* 목록 렌더링 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)' }}>
          로딩 중...
        </div>
      ) : (
        <div className="checklist-list">
          {sortedChecklists.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-sub)' }}>
              조건에 맞는 체크리스트 항목이 없습니다. 👩‍❤️‍👨
            </div>
          ) : (
            sortedChecklists.map((item) => {
              const currentPriority = item.priority || 2;
              let priorityClass = 'prio-medium';
              if (currentPriority === 3) priorityClass = 'prio-high';
              if (currentPriority === 1) priorityClass = 'prio-low';

              return (
                <div key={item.id} className={`glass-card checklist-card status-${item.status}`}>
                  {/* 헤더 */}
                  <div className="checklist-item-header">
                    <div className="checklist-title-wrapper">
                      {/* 중요도 뱃지 (실시간 드롭다운 형태) */}
                      {editingId !== item.id && (
                        <select
                          className="checklist-status-select"
                          style={{
                            fontSize: '10px',
                            padding: '2px 4px',
                            marginRight: '2px',
                            border: 'none',
                            background: currentPriority === 3 ? 'rgba(239, 68, 68, 0.15)' : currentPriority === 2 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: currentPriority === 3 ? '#ef4444' : currentPriority === 2 ? '#ea580c' : '#16a34a',
                            fontWeight: '700'
                          }}
                          value={currentPriority}
                          onChange={(e) => handlePriorityChange(item.id, item, Number(e.target.value))}
                        >
                          <option value={3}>🔥 긴급</option>
                          <option value={2}>⚡ 보통</option>
                          <option value={1}>🌱 낮음</option>
                        </select>
                      )}

                      {editingId === item.id ? (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <input
                            type="text"
                            className="checklist-input"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            style={{ padding: '6px 12px', fontSize: '14px' }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id, item)}
                            className="checklist-action-icon-btn"
                            style={{ color: 'var(--primary)' }}
                            title="저장"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="checklist-action-icon-btn"
                            style={{ color: 'var(--text-sub)' }}
                            title="취소"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="checklist-title">{item.title}</span>
                      )}
                    </div>

                    {editingId !== item.id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* 대분류 상태 드롭다운 */}
                        <select
                          className="checklist-status-select"
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, item, e.target.value)}
                        >
                          <option value="pending">미정 💤</option>
                          <option value="progress">진행중 ⚡</option>
                          <option value="completed">완료 💖</option>
                        </select>

                        {/* 인라인 수정 및 삭제 */}
                        <div className="checklist-actions">
                          <button
                            onClick={() => handleStartEdit(item.id, item.title)}
                            className="checklist-action-icon-btn"
                            title="수정"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.title)}
                            className="checklist-action-icon-btn delete"
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5단계 하트 진행도 */}
                  <div className="checklist-progress-container">
                    <div className="checklist-stage-row">
                      <div className="checklist-hearts-wrapper">
                        {[1, 2, 3, 4, 5].map((stageNum) => {
                          const isFilled = item.progressStage >= stageNum;
                          return (
                            <button
                              key={stageNum}
                              type="button"
                              className="checklist-heart-btn"
                              onClick={() => handleStageChange(item.id, item, stageNum)}
                              title={`${stageNum * 20}% 진행`}
                            >
                              <Heart
                                className={`checklist-heart-icon ${isFilled ? 'filled' : 'empty'}`}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <span className="checklist-stage-badge">
                        {getStageLabel(item.progressStage || 0)}
                      </span>
                    </div>
                    {/* 게이지바 */}
                    <div className="checklist-mini-progress-bar">
                      <div
                        className="checklist-mini-progress-fill"
                        style={{ width: `${(item.progressStage || 0) * 20}%` }}
                      />
                    </div>
                  </div>

                  {/* 아바타 및 작성일 */}
                  <div className="checklist-meta-row">
                    <div className="checklist-author-info">
                      {userProfiles[item.authorUid]?.photoURL ? (
                        <img
                          src={userProfiles[item.authorUid].photoURL}
                          alt="Profile"
                          className="checklist-author-avatar"
                        />
                      ) : (
                        <div className="checklist-author-fallback">
                          {getDisplayName(item.authorUid)[0] || '유'}
                        </div>
                      )}
                      <span>{getDisplayName(item.authorUid)}</span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Checklist;
