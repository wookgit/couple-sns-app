import React, { useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Link2, User, Heart, Shield } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [connectionCode, setConnectionCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const generateCode = () => {
    const code = 'MOM-' + Math.floor(100000 + Math.random() * 900000);
    setConnectionCode(code);
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (!connectionCode) return;
    navigator.clipboard.writeText(connectionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <header className="app-header">
        <h1 className="app-title">Settings</h1>
      </header>

      {/* 프로필 카드 */}
      <div className="profile-section-card glass-card">
        <div className="profile-avatar-wrapper">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="large-avatar" />
          ) : (
            <div className="large-avatar-fallback">
              <User size={40} />
            </div>
          )}
          <div className="profile-badge">
            <Heart size={14} fill="white" color="white" />
          </div>
        </div>
        <div className="profile-info-details">
          <h2>{user?.displayName || '익명의 커플'}</h2>
          <p>{user?.email || '이메일 정보 없음'}</p>
        </div>
      </div>

      {/* 연동 코드 영역 */}
      <div className="settings-section glass-card" style={{ marginTop: '20px' }}>
        <div className="section-title-row">
          <Link2 size={18} className="icon-pink" />
          <h3>커플 연동</h3>
        </div>
        
        <p className="settings-description">
          상대방 폰에 이 앱을 설치한 뒤 아래의 초대 코드를 입력하여 둘만의 프라이빗 커플 SNS를 연동하세요.
        </p>

        {connectionCode ? (
          <div className="code-display-area">
            <span className="moments-code">{connectionCode}</span>
            <button onClick={copyToClipboard} className="copy-code-btn">
              {copied ? '복사됨!' : '코드 복사'}
            </button>
          </div>
        ) : (
          <button onClick={generateCode} className="action-row-btn primary-action">
            연동 코드 생성
          </button>
        )}
      </div>

      {/* 기타 메뉴 */}
      <div className="settings-section glass-card" style={{ marginTop: '20px' }}>
        <div className="section-title-row">
          <Shield size={18} className="icon-blue" />
          <h3>앱 및 보안 설정</h3>
        </div>

        <button onClick={handleLogout} className="action-row-btn logout-action">
          <LogOut size={16} />
          <span>로그아웃</span>
        </button>
      </div>

      <div className="app-info-footer">
        <p>Our Moments v1.0.0 (PWA)</p>
        <p style={{ marginTop: '4px' }}>Made with ❤️ for Lovely Couples</p>
      </div>
    </div>
  );
};

export default Settings;
