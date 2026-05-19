import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock } from 'lucide-react';

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [eventDate, setEventDate] = useState('');

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

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;

    try {
      await addDoc(collection(db, 'events'), {
        title,
        memo,
        date: eventDate,
        authorUid: user?.uid,
        createdAt: new Date().toISOString()
      });

      setTitle('');
      setMemo('');
      setEventDate('');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding event:', error);
      alert('일정 추가 중 오류가 발생했습니다.');
    }
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
              <div key={event.id} className="event-item glass-card">
                <div className="event-icon-wrapper">
                  <Clock size={16} />
                </div>
                <div className="event-details">
                  <h4 className="event-title">{event.title}</h4>
                  {event.memo && <p className="event-memo">{event.memo}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 일정 추가 플로팅 버튼 */}
      <button onClick={() => {
        setEventDate(selectedDateStr);
        setIsModalOpen(true);
      }} className="fab-btn" aria-label="일정 등록하기">
        <Plus size={28} />
      </button>

      {/* 일정 추가 모달 */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>새로운 일정 추가</h2>
              <button onClick={() => setIsModalOpen(false)} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddEvent}>
              <div className="form-group">
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
                disabled={!title.trim() || !eventDate}
                className="submit-btn"
              >
                일정 저장하기
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
