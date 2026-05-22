import React from 'react';
import { Bell, User, X } from 'lucide-react';

const NotificationsModal = ({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkAllAsRead, 
  onNotificationClick 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} className="icon-pink" />
            <h2 style={{ margin: 0 }}>알림 히스토리</h2>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="닫기">
            <X size={24} />
          </button>
        </div>

        {notifications.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <button 
              onClick={onMarkAllAsRead}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              모두 읽음 처리
            </button>
          </div>
        )}

        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="notifications-empty">
              아직 도착한 알림이 없습니다. 💌
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`notification-item ${!notif.read ? 'unread' : ''}`}
                onClick={() => onNotificationClick(notif)}
              >
                {notif.senderPhoto ? (
                  <img src={notif.senderPhoto} alt="Sender" className="notification-item-avatar" />
                ) : (
                  <div className="notification-item-avatar-fallback">
                    <User size={18} />
                  </div>
                )}
                <div className="notification-item-content">
                  <div className="notification-item-title">{notif.title}</div>
                  <div className="notification-item-body">{notif.body}</div>
                  <div className="notification-item-date">
                    {new Date(notif.createdAt).toLocaleString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="detail-actions" style={{ textAlign: 'center', marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={onClose} 
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
  );
};

export default NotificationsModal;
