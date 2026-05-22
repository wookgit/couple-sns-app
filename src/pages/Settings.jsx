import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/CustomAlertContext';
import { LogOut, Link2, User, Heart, Shield, Bell, Camera, Edit2, X, RefreshCw } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { alert, confirm } = useAlert();
  const [connectionCode, setConnectionCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(
    'Notification' in window ? Notification.permission === 'granted' : false
  );

  const [isProfileDetailOpen, setIsProfileDetailOpen] = useState(false);
  // 기존 상태들 유지
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [inputCode, setInputCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState(null);

  // 상대방 프로필 실시간 감시 (닉네임 변경 즉시 반영)
  useEffect(() => {
    if (!db || !user?.partnerUid) {
      setPartnerProfile(null);
      return;
    }

    const partnerRef = doc(db, 'users', user.partnerUid);
    const unsubscribe = onSnapshot(partnerRef, (docSnap) => {
      if (docSnap.exists()) {
        setPartnerProfile(docSnap.data());
      } else {
        setPartnerProfile(null);
      }
    }, (err) => {
      console.error("Error loading partner profile:", err);
    });

    return () => unsubscribe();
  }, [user?.partnerUid]);

  // 컴포넌트 마운트 및 user 상태 바뀔 때 정보 로드
  useEffect(() => {
    if (user) {
      setEditDisplayName(user.displayName || '');
      setEditPhotoURL(user.photoURL || '');
      if (user.connectionCode) {
        setConnectionCode(user.connectionCode);
      }
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCacheClearAndRefresh = async () => {
    const isConfirmed = await confirm(
      "앱 캐시 및 서비스 워커를 비우고 강제로 새로고침하시겠습니까?\n화면 업데이트가 제대로 반영되지 않을 때 유용합니다."
    );
    if (!isConfirmed) return;

    try {
      // 1. Service Worker 해제
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      // 2. 캐시 스토리지 삭제
      if ('caches' in window) {
        const keys = await caches.keys();
        for (let key of keys) {
          await caches.delete(key);
        }
      }
      await alert('캐시가 초기화되었습니다. 최신 버전으로 앱을 다시 불러옵니다! 🚀');
      // 3. 강제 새로고침
      window.location.reload(true);
    } catch (err) {
      console.error('Error clearing cache:', err);
      await alert('캐시 비우기 중 오류가 발생했습니다.');
    }
  };

  const generateCode = async () => {
    if (!user || !db) return;
    const code = 'MOM-' + Math.floor(100000 + Math.random() * 900000);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        connectionCode: code
      }, { merge: true });
      setConnectionCode(code);
      setCopied(false);
      await alert('연동 코드가 생성되었습니다! 💖\n상대방에게 전달하여 연결해 보세요.');
    } catch (err) {
      console.error("Error generating connection code:", err);
      await alert('연동 코드 생성 중 오류가 발생했습니다.');
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!inputCode.trim() || !user || !db) return;
    const targetCode = inputCode.trim().toUpperCase();
    
    setConnecting(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('connectionCode', '==', targetCode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        await alert('존재하지 않거나 올바르지 않은 연동 코드입니다. 😢');
        setConnecting(false);
        return;
      }
      
      const partnerDoc = querySnapshot.docs[0];
      const partnerUid = partnerDoc.id;
      const partnerData = partnerDoc.data();
      
      if (partnerUid === user.uid) {
        await alert('본인의 코드는 입력할 수 없습니다. 상대방의 코드를 입력해 주세요! 😅');
        setConnecting(false);
        return;
      }
      
      // 기존에 연결된 기록이 있어도 덮어쓰도록 허용 (단일 커플앱 특성상 유연하게 연동)
      
      await setDoc(doc(db, 'users', user.uid), {
        partnerUid: partnerUid,
        partnerName: partnerData.displayName || '익명의 커플'
      }, { merge: true });
      
      await setDoc(doc(db, 'users', partnerUid), {
        partnerUid: user.uid,
        partnerName: user.displayName || '익명의 커플'
      }, { merge: true });
      
      await alert(`${partnerData.displayName || '상대방'} 님과 성공적으로 연동되었습니다! 👩‍❤️‍👨`);
      setInputCode('');
    } catch (err) {
      console.error("Error connecting with partner:", err);
      await alert('연동 중 오류가 발생했습니다.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user || !db) return;
    const isConfirmed = await confirm('정말로 연동을 해제하시겠습니까?\n연동을 해제해도 작성된 글이나 일정은 유지됩니다.');
    if (!isConfirmed) return;
    
    try {
      const partnerUid = user.partnerUid;
      
      await setDoc(doc(db, 'users', user.uid), {
        partnerUid: null,
        partnerName: null
      }, { merge: true });
      
      if (partnerUid) {
        await setDoc(doc(db, 'users', partnerUid), {
          partnerUid: null,
          partnerName: null
        }, { merge: true });
      }
      
      await alert('연동이 해제되었습니다. 😢');
    } catch (err) {
      console.error("Error disconnecting partner:", err);
      await alert('연동 해제 중 오류가 발생했습니다.');
    }
  };

  const handleResetCode = async () => {
    if (!user || !db) return;
    const isConfirmed = await confirm('생성된 연동 코드를 삭제하고 초기화하시겠습니까?');
    if (!isConfirmed) return;

    try {
      await setDoc(doc(db, 'users', user.uid), {
        connectionCode: null
      }, { merge: true });
      setConnectionCode('');
      await alert('연동 코드가 삭제되었습니다.');
    } catch (err) {
      console.error("Error resetting connection code:", err);
      await alert('코드 초기화 중 오류가 발생했습니다.');
    }
  };

  const copyToClipboard = () => {
    if (!connectionCode) return;
    navigator.clipboard.writeText(connectionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      await alert('이 기기/브라우저는 푸시 알림을 지원하지 않습니다.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        await alert('실시간 푸시 알림이 정상적으로 활성화되었습니다! 💖\n상대방이 글을 등록하면 즉시 푸시 알림이 발송됩니다.');
      } else {
        setPushEnabled(false);
        await alert('알림 권한이 거부되었습니다.\n실시간 알림을 받으시려면 기기 설정(주소창 자물쇠 버튼 등)에서 알림 권한을 허용해 주세요!');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      await alert('알림 설정을 구성하는 중 오류가 발생했습니다.');
    }
  };

  // 아바타 전용 컴프레서 (120x120px 초경량 JPEG 압축)
  const compressAvatar = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const SIZE = 120; // 프로필 썸네일용 초소형 최적화
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          // 0.6 압축률을 적용하여 10KB 미만으로 극압축
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const base64Image = await compressAvatar(file);
      setEditPhotoURL(base64Image);
    } catch (error) {
      console.error('Error compressing avatar image:', error);
      await alert('이미지 압축 및 변환에 실패했습니다.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editDisplayName.trim()) {
      await alert('닉네임을 입력해 주세요!');
      return;
    }

    setUpdatingProfile(true);
    try {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, {
          displayName: editDisplayName.trim(),
          photoURL: editPhotoURL
        }, { merge: true });

        await alert('프로필이 성공적으로 업데이트되었습니다! 💖');
        setIsEditingProfile(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      await alert('프로필을 변경하는 동안 오류가 발생했습니다.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <header className="app-header">
        <h1 className="app-title">Settings</h1>
      </header>

      {/* 프로필 카드 (수정 기능 융합) */}
      <div className="profile-section-card glass-card">
        {!isEditingProfile ? (
          <>
            <div
              className="profile-avatar-wrapper"
              onClick={() => setIsProfileDetailOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="large-avatar" />
              ) : (
                <div className="large-avatar-fallback">
                  <User size={40} />
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditingProfile(true); }}
                className="profile-edit-trigger"
                title="프로필 수정"
              >
                <Edit2 size={13} />
              </button>
            </div>

            <div className="profile-info-details">
              <h2>{user?.displayName || '익명의 커플'}</h2>
              <p>{user?.email || '이메일 정보 없음'}</p>
            </div>
          </>
        ) : (
          /* 수정 중인 폼 상태 */
          <form onSubmit={handleSaveProfile} className="profile-edit-form">
            <div className="profile-avatar-wrapper">
              {editPhotoURL ? (
                <img src={editPhotoURL} alt="Preview" className="large-avatar" />
              ) : (
                <div className="large-avatar-fallback">
                  <User size={40} />
                </div>
              )}

              <label className="avatar-upload-overlay" htmlFor="avatar-file-input">
                <Camera size={18} style={{ marginBottom: '2px' }} />
                <span>사진 변경</span>
              </label>

              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>

            <input
              type="text"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="profile-name-input"
              placeholder="닉네임 입력"
              maxLength={12}
              required
              disabled={updatingProfile}
            />

            <div className="profile-edit-actions-row">
              <button
                type="submit"
                className="profile-edit-btn save"
                disabled={updatingProfile}
              >
                {updatingProfile ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setEditDisplayName(user?.displayName || '');
                  setEditPhotoURL(user?.photoURL || '');
                }}
                className="profile-edit-btn cancel"
                disabled={updatingProfile}
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>
      {/* 프로필 상세 보기 모달 */}
      {isProfileDetailOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>프로필 상세 보기</h2>
              <button onClick={() => setIsProfileDetailOpen(false)} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <div className="detail-body" style={{ textAlign: 'center', padding: '20px' }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="large-avatar" style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '12px' }} />
              ) : (
                <User size={80} style={{ marginBottom: '12px' }} />
              )}
              <h3>{user?.displayName || '익명의 커플'}</h3>
              <p>{user?.email || '이메일 정보 없음'}</p>
            </div>

            <div className="detail-actions" style={{ textAlign: 'center', marginBottom: '12px' }}>
              <button
                onClick={() => { setIsEditingProfile(true); setIsProfileDetailOpen(false); }}
                className="detail-btn edit-btn"
              >
                <Edit2 size={14} /> 수정
              </button>
              <button onClick={() => setIsProfileDetailOpen(false)} className="detail-btn close-action-btn" style={{ marginLeft: '8px' }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 연동 코드 영역 */}
      <div className="settings-section glass-card" style={{ marginTop: '20px' }}>
        <div className="section-title-row">
          <Link2 size={18} className="icon-pink" />
          <h3 style={{ margin: 0 }}>{user?.partnerUid ? '연동 완료 👩‍❤️‍👨' : '커플 연동'}</h3>
        </div>

        {user?.partnerUid ? (
          <>
            <div className="partner-profile-card" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid var(--glass-border)',
              marginTop: '12px',
              marginBottom: '12px'
            }}>
              {partnerProfile?.photoURL ? (
                <img 
                  src={partnerProfile.photoURL} 
                  alt="Partner Avatar" 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    objectFit: 'cover', 
                    border: '2px solid var(--primary-light)',
                    boxShadow: 'var(--shadow-sm)'
                  }} 
                />
              ) : (
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  background: 'var(--primary-light)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justify: 'center', 
                  color: 'var(--primary)' 
                }}>
                  <Heart size={24} fill="var(--primary)" />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <span style={{ 
                  color: 'var(--primary)', 
                  fontWeight: '600', 
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {partnerProfile?.displayName || user.partnerName || '상대방'}
                  <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-sub)' }}>님</span>
                </span>
                <span style={{ color: 'var(--text-sub)', fontSize: '13px' }}>
                  {partnerProfile?.email || '이메일 정보 없음'}
                </span>
              </div>
            </div>
            <p className="settings-description" style={{ marginTop: '8px' }}>
              소중하게 연결된 상태입니다. 둘만의 사진첩과 일정을 함께 채워나가 보세요! 💕
            </p>
            <button 
              onClick={handleDisconnect} 
              className="action-row-btn"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                marginTop: '12px'
              }}
            >
              연동 해제하기
            </button>
          </>
        ) : (
          <>
            <p className="settings-description">
              상대방 폰에 이 앱을 설치한 뒤 아래의 초대 코드를 발급받아 공유하거나, 상대방의 코드를 입력하여 둘만의 프라이빗 커플 SNS를 연동하세요.
            </p>

            <div style={{ marginTop: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px', textAlign: 'left' }}>내 연동 코드</h4>
              {connectionCode ? (
                <div>
                  <div className="code-display-area">
                    <span className="moments-code">{connectionCode}</span>
                    <button onClick={copyToClipboard} className="copy-code-btn">
                      {copied ? '복사됨!' : '코드 복사'}
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={handleResetCode} 
                    className="action-row-btn"
                    style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.1)',
                      marginTop: '8px',
                      padding: '10px',
                      fontSize: '13px'
                    }}
                  >
                    코드 초기화 (삭제)
                  </button>
                </div>
              ) : (
                <button onClick={generateCode} className="action-row-btn primary-action">
                  연동 코드 생성
                </button>
              )}
            </div>

            <form onSubmit={handleConnect} style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px', textAlign: 'left' }}>상대방 연동 코드 등록</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="예: MOM-123456"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="modal-input"
                  style={{ 
                    margin: 0, 
                    flex: 1, 
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    fontWeight: '600',
                    letterSpacing: '1px'
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={connecting}
                  className="submit-btn"
                  style={{ 
                    margin: 0, 
                    width: 'auto', 
                    padding: '0 20px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {connecting ? '연결 중...' : '연결하기'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* 실시간 PWA 알림 권한 설정 */}
      <div className="settings-section glass-card" style={{ marginTop: '20px' }}>
        <div className="section-title-row">
          <Bell size={18} className="icon-pink" />
          <h3>알림 설정</h3>
        </div>

        <p className="settings-description">
          상대방이 새로운 글을 공유하면 즉시 홈 화면이나 배경화면 위에 시스템 푸시 알림으로 소식을 배달합니다.
        </p>

        <button
          onClick={requestNotificationPermission}
          className="action-row-btn"
          style={{
            background: pushEnabled ? 'rgba(76, 175, 80, 0.08)' : 'var(--primary-light)',
            color: pushEnabled ? '#2e7d32' : 'white',
            border: pushEnabled ? '1px solid rgba(76, 175, 80, 0.2)' : 'none',
            marginTop: '8px'
          }}
        >
          {pushEnabled ? '✓ 실시간 알림 활성화됨' : '알림 권한 켜기'}
        </button>
      </div>

      {/* 기타 메뉴 */}
      <div className="settings-section glass-card" style={{ marginTop: '20px' }}>
        <div className="section-title-row">
          <Shield size={18} className="icon-blue" />
          <h3>앱 및 보안 설정</h3>
        </div>

        <button 
          onClick={handleCacheClearAndRefresh} 
          className="action-row-btn"
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            color: '#2563eb',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <RefreshCw size={14} />
          <span>캐시 비우기 및 강제 새로고침</span>
        </button>

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
