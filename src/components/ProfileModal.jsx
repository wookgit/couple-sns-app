import React from 'react';
import { User, X } from 'lucide-react';

const ProfileModal = ({ selectedProfileUser, onClose }) => {
  if (!selectedProfileUser) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>프로필 정보</h2>
          <button onClick={onClose} className="close-btn" aria-label="닫기">
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

export default ProfileModal;
