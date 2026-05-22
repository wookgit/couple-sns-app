import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/CustomAlertContext';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, Camera, Edit2, Trash2, MessageCircle, User, Send } from 'lucide-react';
import { sendNotification } from '../services/notificationService';

const Calendar = () => {
  const { user } = useAuth();
  const { alert, confirm } = useAlert();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // 입력 폼 상태
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [eventDate, setEventDate] = useState('');
  
  // 프리미엄 시간 선택 상태 (오전/오후, 시, 분 분할 선택)
  const [useTime, setUseTime] = useState(false);
  const [eventAmPm, setEventAmPm] = useState('오전');
  const [eventHour, setEventHour] = useState('12');
  const [eventMin, setEventMin] = useState('00');

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [userProfiles, setUserProfiles] = useState({});
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Firestore 실시간 일정 연동
  useEffect(() => {
    if (!db || !user) return;
    
    // 오직 나와 상대방의 일정만 가져오도록 필터링
    const authors = user.partnerUid ? [user.uid, user.partnerUid] : [user.uid];
    const q = query(
      collection(db, 'events'),
      where('authorUid', 'in', authors)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [user]);

  // 실시간 모든 사용자 프로필 로딩 (댓글 아바타와 닉네임 실시간 반영)
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

  // 달력 날짜 계산
  const getDaysInMonth = (y, m) => {
    const firstDay = new Date(y, m, 1).getDay();
    const totalDays = new Date(y, m + 1, 0).getDate();
    
    const days = [];
    // 빈칸 채우기 (이전 달 날짜)
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // 이번 달 날짜 채우기
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(y, m, d));
    }
    return days;
  };

  const days = getDaysInMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatDateString = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 시간 포맷 파싱 헬퍼 함수 (저장된 시간 문자열 -> UI 상태 분해)
  const parseTime = (timeStr) => {
    if (!timeStr) return { ampm: '오전', hour: '12', minute: '00' };
    const parts = timeStr.split(' ');
    if (parts.length === 2) {
      const timeParts = parts[1].split(':');
      return {
        ampm: parts[0], // '오전' 또는 '오후'
        hour: timeParts[0] || '12',
        minute: timeParts[1] || '00'
      };
    }
    // 24시간 표기법(HH:MM) 호환성 폴백
    const rawParts = timeStr.split(':');
    if (rawParts.length === 2) {
      const h = parseInt(rawParts[0], 10);
      const m = rawParts[1];
      const ampm = h >= 12 ? '오후' : '오전';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      return {
        ampm,
        hour: String(displayHour).padStart(2, '0'),
        minute: m
      };
    }
    return { ampm: '오전', hour: '12', minute: '00' };
  };

  // 이미지 압축 및 Base64 변환 헬퍼 함수
  const compressAndConvertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // 모바일 뷰 최적 가로 크기
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // JPEG 압축률 0.7 적용 (용량 50~90KB 내외로 가볍게 보관)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 일정 저장/수정 핸들러
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;

    setUploading(true);
    let finalImageUrl = imagePreview; // 수정일 시 기본 이미지 유지
    
    // 시간 정보 포맷팅 (예: "오후 02:30" 형태로 명확하게 가독성 높은 저장)
    const formattedTime = useTime ? `${eventAmPm} ${eventHour}:${eventMin}` : '';

    try {
      if (image) {
        finalImageUrl = await compressAndConvertToBase64(image);
      }

      if (isEditing && selectedEvent) {
        // 기존 일정 수정
        await updateDoc(doc(db, 'events', selectedEvent.id), {
          title,
          memo,
          date: eventDate,
          time: formattedTime,
          imageUrl: finalImageUrl
        });
      } else {
        // 새로운 일정 저장
        await addDoc(collection(db, 'events'), {
          title,
          memo,
          date: eventDate,
          time: formattedTime,
          imageUrl: finalImageUrl,
          authorUid: user?.uid,
          createdAt: new Date().toISOString()
        });
        sendNotification(
          user,
          'calendar',
          '새로운 일정 등록 📅',
          `${user.displayName || '상대방'}님이 새로운 일정을 등록했어요: "${title}"`,
          'calendar'
        );
      }

      // 초기화 및 닫기
      setTitle('');
      setMemo('');
      setEventDate('');
      setUseTime(false);
      setEventAmPm('오전');
      setEventHour('12');
      setEventMin('00');
      setImage(null);
      setImagePreview('');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('일정 저장 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 일정 삭제 핸들러
  const handleDeleteEvent = async (eventId) => {
    const isConfirmed = await confirm('정말로 이 일정을 삭제하시겠습니까?');
    if (!isConfirmed) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setIsDetailOpen(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('일정 삭제 중 오류가 발생했습니다.');
    }
  };

  const scrollToLatestComment = (eventId) => {
    setTimeout(() => {
      const element = document.getElementById(`comments-list-${eventId}`);
      if (element) {
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 80);
  };

  const handleAddComment = async (eventId, text) => {
    if (!text.trim() || !user || !db) return;
    const eventRef = doc(db, 'events', eventId);

    try {
      await updateDoc(eventRef, {
        comments: arrayUnion({
          id: `${user.uid}_${Date.now()}`,
          authorUid: user.uid,
          authorName: user.displayName || '익명의 커플',
          authorPhoto: user.photoURL || '',
          text: text.trim(),
          createdAt: new Date().toISOString()
        })
      });
      setCommentText('');
      scrollToLatestComment(eventId);
      
      const targetEvent = events.find(e => e.id === eventId);
      if (targetEvent && targetEvent.authorUid !== user.uid) {
        sendNotification(
          user,
          'calendar',
          '일정에 새로운 댓글 💬',
          `${user.displayName || '상대방'}님이 일정에 댓글을 남겼어요: "${text.trim()}"`,
          'calendar'
        );
      }
    } catch (err) {
      console.error('Error adding comment to event:', err);
      alert('댓글 등록 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteComment = async (eventId, comment) => {
    const isConfirmed = await confirm('이 댓글을 삭제하시겠습니까?');
    if (!isConfirmed) return;
    const eventRef = doc(db, 'events', eventId);
    try {
      await updateDoc(eventRef, {
        comments: arrayRemove(comment)
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateComment = async (eventId, commentId, newText) => {
    if (!newText.trim() || !db || !user) return;
    const eventRef = doc(db, 'events', eventId);

    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;
      const updatedComments = event.comments.map((c) => {
        if (c.id === commentId) {
          return { ...c, text: newText.trim() };
        }
        return c;
      });

      await updateDoc(eventRef, {
        comments: updatedComments
      });
      setEditingCommentId(null);
      setEditingText('');
    } catch (err) {
      console.error('Error updating comment:', err);
      alert('댓글 수정 중 오류가 발생했습니다.');
    }
  };

  const handleOpenProfile = (uid, fallbackName, fallbackPhoto) => {
    const profile = userProfiles[uid] || {};
    setSelectedProfileUser({
      displayName: profile.displayName || fallbackName || '익명의 커플',
      photoURL: profile.photoURL || fallbackPhoto || '',
      email: profile.email || '이메일 정보 없음'
    });
  };

  // 상세 보기 모달 켜기
  const openDetail = (event) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  // 수정 모드 전환
  const openEditMode = (event) => {
    setIsDetailOpen(false);
    setSelectedEvent(event);
    setIsEditing(true);
    setTitle(event.title);
    setMemo(event.memo || '');
    setEventDate(event.date);
    
    // 시간 파싱하여 각 셀렉트 박스 바인딩
    if (event.time) {
      setUseTime(true);
      const { ampm, hour, minute } = parseTime(event.time);
      setEventAmPm(ampm);
      setEventHour(hour);
      setEventMin(minute);
    } else {
      setUseTime(false);
      setEventAmPm('오전');
      setEventHour('12');
      setEventMin('00');
    }
    
    setImagePreview(event.imageUrl || '');
    setImage(null);
    setIsModalOpen(true);
  };

  // 추가 모드 전환
  const openAddMode = () => {
    setIsEditing(false);
    setSelectedEvent(null);
    setTitle('');
    setMemo('');
    setEventDate(selectedDateStr);
    
    // 시간 초기화
    setUseTime(false);
    setEventAmPm('오전');
    setEventHour('12');
    setEventMin('00');
    
    setImage(null);
    setImagePreview('');
    setIsModalOpen(true);
  };

  // 선택된 날짜의 일정 필터링
  const selectedDateStr = formatDateString(selectedDate);
  const selectedEvents = events.filter((event) => event.date === selectedDateStr);

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <header className="app-header">
        <h1 className="app-title">Our Schedule</h1>
      </header>

      {/* 달력 카드 */}
      <div className="calendar-card glass-card">
        <div className="calendar-header">
          <button onClick={prevMonth} className="nav-arrow-btn" aria-label="이전 달">
            <ChevronLeft size={20} />
          </button>
          <span className="current-month">
            {year}년 {month + 1}월
          </span>
          <button onClick={nextMonth} className="nav-arrow-btn" aria-label="다음 달">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 요일 */}
        <div className="weekdays-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map((w, index) => (
            <span key={w} className={`weekday ${index === 0 ? 'sun' : index === 6 ? 'sat' : ''}`}>
              {w}
            </span>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="days-grid">
          {days.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} className="day-cell empty"></span>;
            
            const dateStr = formatDateString(day);
            const isToday = formatDateString(new Date()) === dateStr;
            const isSelected = selectedDateStr === dateStr;
            const hasEvents = events.some((event) => event.date === dateStr);
            const dayOfWeek = day.getDay();

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(day)}
                className={`day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayOfWeek === 0 ? 'sun' : dayOfWeek === 6 ? 'sat' : ''}`}
              >
                <span className="day-number">{day.getDate()}</span>
                {hasEvents && <span className="event-marker"></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택한 날짜의 일정 목록 */}
      <div className="day-events-section">
        <div className="section-header">
          <h3>
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정
          </h3>
        </div>

        <div className="events-list">
          {selectedEvents.length === 0 ? (
            <div className="empty-events">
              <p>일정이 없습니다. 새로운 일정을 등록해 보세요!</p>
            </div>
          ) : (
            selectedEvents.map((event) => (
              <div 
                key={event.id} 
                onClick={() => openDetail(event)}
                className="event-item glass-card"
                style={{ cursor: 'pointer' }}
              >
                <div className="event-icon-wrapper">
                  <Clock size={16} />
                </div>
                <div className="event-details">
                  <div className="event-title-row">
                    <h4 className="event-title">{event.title}</h4>
                    {event.time && <span className="event-time-tag">{event.time}</span>}
                  </div>
                  {event.memo && <p className="event-memo">{event.memo}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 일정 추가 플로팅 버튼 */}
      <button onClick={openAddMode} className="fab-btn" aria-label="일정 등록하기">
        <Plus size={28} />
      </button>

      {/* 일정 상세 보기 모달 */}
      {isDetailOpen && selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>일정 상세 보기</h2>
              <button onClick={() => setIsDetailOpen(false)} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <div className="detail-body">
              {selectedEvent.imageUrl && (
                <img src={selectedEvent.imageUrl} alt="" className="detail-image" />
              )}
              <h3 className="detail-title">{selectedEvent.title}</h3>
              
              <div className="detail-info-row">
                <CalendarIcon size={16} />
                <span>
                  {selectedEvent.date} {selectedEvent.time ? `| ${selectedEvent.time}` : ''}
                </span>
              </div>

              {selectedEvent.memo && (
                <div className="detail-memo-box">
                  <p>{selectedEvent.memo}</p>
                </div>
              )}
            </div>

            <div className="detail-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
              <button 
                onClick={() => openEditMode(selectedEvent)} 
                className="detail-btn edit-btn"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Edit2 size={14} />
                <span>수정</span>
              </button>
              <button 
                onClick={() => handleDeleteEvent(selectedEvent.id)} 
                className="detail-btn delete-btn"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} />
                <span>삭제</span>
              </button>
              <button 
                onClick={() => setIsDetailOpen(false)} 
                className="detail-btn close-action-btn"
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>

            {/* 댓글 영역 (디자인 개선) */}
            <div className="comments-section" style={{ marginTop: '24px', borderTop: '1px dashed var(--glass-border)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageCircle size={18} className="icon-pink" /> 
                일정 댓글 <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>{(() => {
                  const ce = events.find(e => e.id === selectedEvent.id) || selectedEvent;
                  return ce.comments?.length || 0;
                })()}</span>
              </h4>
              
              <div className="comments-list" id={`comments-list-${selectedEvent.id}`} style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
                {(() => {
                  const currentEvent = events.find(e => e.id === selectedEvent.id) || selectedEvent;
                  return currentEvent.comments && currentEvent.comments.length > 0 ? (
                    [...currentEvent.comments]
                      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
                      .map((comment) => {
                      const isMyComment = comment.authorUid === user?.uid || comment.id?.startsWith(user?.uid);
                      
                      const cProfile = userProfiles[comment.authorUid] || {};
                      const cName = cProfile.displayName || comment.authorName || '익명의 커플';
                      const cPhoto = cProfile.photoURL || comment.authorPhoto;

                      return (
                        <div key={comment.id} className="comment-item">
                          {cPhoto ? (
                            <img
                              src={cPhoto}
                              alt=""
                              className="comment-avatar"
                              onClick={() => handleOpenProfile(comment.authorUid, cName, cPhoto)}
                              style={{ cursor: 'pointer' }}
                            />
                          ) : (
                            <div
                              className="comment-avatar-fallback"
                              onClick={() => handleOpenProfile(comment.authorUid, cName, cPhoto)}
                              style={{ cursor: 'pointer' }}
                            >
                              {cName[0]}
                            </div>
                          )}
                          <div className="comment-item-body">
                            <div className="comment-content">
                              {editingCommentId === comment.id ? (
                                <form 
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleUpdateComment(selectedEvent.id, comment.id, editingText);
                                  }}
                                  className="comment-edit-form"
                                >
                                  <input 
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="comment-edit-input"
                                    required
                                    autoFocus
                                  />
                                  <div className="comment-edit-actions">
                                    <button type="submit" className="comment-edit-btn save">저장</button>
                                    <button type="button" onClick={() => setEditingCommentId(null)} className="comment-edit-btn cancel">취소</button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <span
                                    className="comment-author"
                                    onClick={() => handleOpenProfile(comment.authorUid, cName, cPhoto)}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {cName}
                                  </span>
                                  <span className="comment-text">{comment.text}</span>
                                </>
                              )}
                            </div>

                            {editingCommentId !== comment.id && (
                              <div className="comment-actions-row">
                                {isMyComment && (
                                  <>
                                    <button 
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingText(comment.text);
                                      }} 
                                      className="comment-action-btn edit"
                                    >
                                      수정
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteComment(selectedEvent.id, comment)} 
                                      className="comment-action-btn delete"
                                    >
                                      삭제
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-sub)', padding: '4px 0', textAlign: 'center' }}>첫 번째 댓글을 달아보세요! 💌</p>
                  );
                })()}
              </div>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddComment(selectedEvent.id, commentText);
                }} 
                className="comment-form"
              >
                <input 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="둘만의 댓글 남기기..." 
                  className="comment-input" 
                  required 
                  autoComplete="off"
                />
                <button type="submit" className="comment-submit-btn" aria-label="댓글 등록">
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 일정 추가/수정 모달 */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>{isEditing ? '일정 수정하기' : '새로운 일정 추가'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              {/* 이미지 업로드 영역 */}
              <div className="image-upload-area" onClick={() => document.getElementById('event-image-input').click()}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="upload-preview" />
                ) : (
                  <div className="upload-placeholder">
                    <Camera size={32} />
                    <span>일정 사진 첨부하기 (선택)</span>
                  </div>
                )}
                <input
                  type="file"
                  id="event-image-input"
                  accept="image/*"
                  onChange={handleImageChange}
                  hidden
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>일정 제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 맛집 데이트, 100일 기념일"
                  className="modal-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>날짜 선택</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="modal-input"
                  required
                />
              </div>

              {/* 프리미엄 오전/오후 시간 선택기 */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    id="use-time-checkbox"
                    checked={useTime}
                    onChange={(e) => setUseTime(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <label htmlFor="use-time-checkbox" style={{ cursor: 'pointer', margin: 0, fontSize: '13px', fontWeight: 600 }}>
                    약속 시간 지정하기
                  </label>
                </div>

                {useTime && (
                  <div className="time-select-container">
                    <select
                      value={eventAmPm}
                      onChange={(e) => setEventAmPm(e.target.value)}
                      className="modal-select ampm"
                    >
                      <option value="오전">오전</option>
                      <option value="오후">오후</option>
                    </select>

                    <select
                      value={eventHour}
                      onChange={(e) => setEventHour(e.target.value)}
                      className="modal-select hour"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}시</option>
                      ))}
                    </select>

                    <select
                      value={eventMin}
                      onChange={(e) => setEventMin(e.target.value)}
                      className="modal-select minute"
                    >
                      {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                        <option key={m} value={m}>{m}분</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>커플 메모 (선택)</label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="기억해 둘 특별한 메모를 남겨주세요..."
                  rows={3}
                  className="modal-textarea"
                  style={{ marginTop: 0 }}
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !title.trim() || !eventDate}
                className="submit-btn"
              >
                {uploading ? '저장 중...' : isEditing ? '수정 완료하기' : '일정 저장하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 프로필 상세 보기 모달 */}
      {selectedProfileUser && (
        <div className="modal-overlay" onClick={() => setSelectedProfileUser(null)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>프로필 정보</h2>
              <button onClick={() => setSelectedProfileUser(null)} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <div className="detail-body" style={{ textAlign: 'center', padding: '20px' }}>
              {selectedProfileUser.photoURL ? (
                <img 
                  src={selectedProfileUser.photoURL} 
                  alt="Avatar" 
                  className="large-avatar" 
                  style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '12px', objectFit: 'cover', margin: '0 auto 12px' }} 
                />
              ) : (
                <div 
                  className="large-avatar-fallback" 
                  style={{ width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-border)', color: 'var(--text-sub)' }}
                >
                  <User size={60} />
                </div>
              )}
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                {selectedProfileUser.displayName}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
                {selectedProfileUser.email}
              </p>
            </div>

            <div className="detail-actions" style={{ textAlign: 'center', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => setSelectedProfileUser(null)} 
                className="detail-btn close-action-btn"
                style={{ 
                  background: 'rgba(0,0,0,0.05)',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '120px'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
