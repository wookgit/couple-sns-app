import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/CustomAlertContext';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, Camera, Edit2, Trash2 } from 'lucide-react';
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Firestore 실시간 일정 연동
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
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
    </div>
  );
};

export default Calendar;
