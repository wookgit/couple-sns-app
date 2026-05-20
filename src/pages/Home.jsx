import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/CustomAlertContext';
import { Heart, MessageCircle, Camera, Plus, X, Send, User, Bell } from 'lucide-react';
import { sendNotification } from '../services/notificationService';

const Home = () => {
  const { user } = useAuth();
  const { alert, confirm } = useAlert();
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [openComments, setOpenComments] = useState({}); // { [postId]: true/false }
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostText, setEditingPostText] = useState('');
  const [userProfiles, setUserProfiles] = useState({});
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);

  // 실시간 모든 사용자 프로필 로딩 (기존 글/댓글 아바타와 닉네임 실시간 반영)
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

  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // 실시간 알림 목록 불러오기
  useEffect(() => {
    if (!db || !user) return;
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      // 인덱스 생성 오류 방지를 위해 메모리상에서 정렬
      notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(notifs);
    }, (error) => {
      console.error("Error loading notifications:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // 처음 사용자를 위한 웰컴 알림 생성 (알림이 아예 없을 때)
  useEffect(() => {
    if (!db || !user) return;
    const createWelcomeNotification = async () => {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', user.uid)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(collection(db, 'notifications'), {
            recipientUid: user.uid,
            senderUid: 'system_welcome',
            senderName: 'Our Moments 💖',
            senderPhoto: '',
            title: '실시간 알림 기능이 활성화되었습니다! 🎉',
            body: '상대방이 피드 글, 댓글, 좋아요 또는 일정을 등록하면 여기에 실시간으로 표시됩니다. 👩‍❤️‍👨',
            type: 'post',
            createdAt: new Date().toISOString(),
            read: false,
            link: ''
          });
        }
      } catch (err) {
        console.error("Error creating welcome notification:", err);
      }
    };
    createWelcomeNotification();
  }, [user]);

  // 실시간 비교용 posts 최신 상태 보관 Ref (Stale Closure 방지)
  const postsRef = useRef([]);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // 첫 페이지 마운트 시 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 브라우저 네이티브 알림 발송 함수 (서비스 워커 백그라운드 푸시 연동)
  const triggerPushNotification = (title, body) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/manifest-icon-192.maskable.png',
            badge: '/manifest-icon-192.maskable.png',
            vibrate: [200, 100, 200]
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/manifest-icon-192.maskable.png' });
        });
      } catch (err) {
        new Notification(title, { body, icon: '/manifest-icon-192.maskable.png' });
      }
    }
  };

  // Firestore 실시간 데이터 가져오기 및 푸시 알림 트리거
  useEffect(() => {
    if (!db || !user) return;
    
    // 오직 나와 상대방의 글만 가져오도록 필터링 (완전 프라이빗)
    const authors = user.partnerUid ? [user.uid, user.partnerUid] : [user.uid];
    const q = query(
      collection(db, 'posts'), 
      where('authorUid', 'in', authors)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // createdAt 기준 내림차순 정렬 (복합 인덱스 에러 방지)
      postsData.sort((a, b) => b.createdAt - a.createdAt);


      // 초기 마운트 시에는 알림 발송 차단 (postsRef.current가 채워진 상태일 때만 반응)
      if (postsRef.current.length > 0) {
        snapshot.docChanges().forEach((change) => {
          const newPost = change.doc.data();
          const isMyPost = newPost.authorUid === user?.uid;

          // 1. 새 글 추가 감지 (상대방이 쓴 글일 때)
          if (change.type === 'added') {
            const isDifferentAuthor = newPost.authorUid !== user?.uid;
            const postTime = new Date(newPost.createdAt).getTime();
            const nowTime = new Date().getTime();
            if (isDifferentAuthor && (nowTime - postTime < 15000)) {
              triggerPushNotification(
                "새로운 추억 등록 💖",
                `${newPost.authorName || '상대방'}님이 새로운 글을 남겼어요: "${newPost.text || '사진 공유'}"`
              );
            }
          }

          // 2. 글 수정/변경 감지 (좋아요, 댓글 추가 등)
          if (change.type === 'modified' && isMyPost) {
            const oldPost = postsRef.current.find(p => p.id === change.doc.id);
            if (oldPost) {
              // A. 새로운 댓글 감지
              const oldCommentsCount = (oldPost.comments || []).length;
              const newComments = newPost.comments || [];
              if (newComments.length > oldCommentsCount) {
                const latestComment = newComments[newComments.length - 1];
                // 본인이 쓴 대댓글이 아닐 때만 알람
                if (latestComment && latestComment.authorUid !== user?.uid) {
                  triggerPushNotification(
                    "내 글에 새로운 댓글 💬",
                    `${latestComment.authorName || '상대방'}님: "${latestComment.text}"`
                  );
                }
              }

              // B. 새로운 좋아요 감지
              const oldHearts = oldPost.hearts || 0;
              const newHearts = newPost.hearts || 0;
              if (newHearts > oldHearts) {
                const newLikedBy = newPost.likedBy || [];
                const lastLikerUid = newLikedBy[newLikedBy.length - 1];
                // 좋아요를 누른 사람이 내가 아닐 때만 알람
                if (lastLikerUid && lastLikerUid !== user?.uid) {
                  triggerPushNotification(
                    "내 글에 좋아요 💖",
                    "상대방이 내 글에 소중한 마음(좋아요)을 남겼습니다!"
                  );
                }
              }
            }
          }
        });
      }

      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [user]);

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
          const MAX_WIDTH = 800; // 모바일 피드용으로 최적화된 가로 해상도
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

          // JPEG 포맷으로 0.7 압축률로 압축하여 용량을 50~90KB 수준으로 극대화하여 축소
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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!text.trim() && !image) return;

    setUploading(true);
    let finalImageUrl = '';

    try {
      // 이미지 업로드 대신, 브라우저에서 초경량 압축 후 Base64 문자열로 직접 변환
      if (image) {
        finalImageUrl = await compressAndConvertToBase64(image);
      }

      // Firestore 글 추가 (Storage를 전혀 거치지 않고 직접 이미지 저장)
      const docRef = await addDoc(collection(db, 'posts'), {
        text,
        imageUrl: finalImageUrl,
        authorName: user?.displayName || '익명의 커플',
        authorPhoto: user?.photoURL || '',
        authorUid: user?.uid,
        createdAt: new Date().toISOString(),
        hearts: 0,
        likedBy: [],
        comments: []
      });

      // 알림 등록
      sendNotification(
        user,
        'post',
        '새로운 추억 등록 💖',
        `${user.displayName || '상대방'}님이 새로운 글을 남겼어요: "${text ? (text.length > 20 ? text.substring(0, 20) + '...' : text) : '사진 공유'}"`,
        `post_${docRef.id}`
      );

      // 초기화
      setText('');
      setImage(null);
      setImagePreview('');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error sharing post:', error);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 좋아요 토글 핸들러
  const handleLike = async (postId, likedBy = []) => {
    if (!db || !user) return;
    const isLiked = likedBy.includes(user.uid);
    const postRef = doc(db, 'posts', postId);

    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likedBy: arrayRemove(user.uid),
          hearts: increment(-1)
        });
      } else {
        await updateDoc(postRef, {
          likedBy: arrayUnion(user.uid),
          hearts: increment(1)
        });
        sendNotification(
          user,
          'heart',
          '내 글에 좋아요 💖',
          `${user.displayName || '상대방'}님이 내 글에 소중한 마음(좋아요)을 남겼습니다!`,
          `post_${postId}`
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // 최신 댓글 영역으로 자동 포커싱(스크롤 최하단) 헬퍼 함수
  const scrollToLatestComment = (postId) => {
    setTimeout(() => {
      const element = document.getElementById(`comments-list-${postId}`);
      if (element) {
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 80);
  };

  // 댓글 등록 핸들러
  const handleAddComment = async (postId, commentText) => {
    if (!commentText.trim() || !user || !db) return;
    const postRef = doc(db, 'posts', postId);

    try {
      await updateDoc(postRef, {
        comments: arrayUnion({
          id: `${user.uid}_${Date.now()}`,
          authorUid: user.uid,
          authorName: user.displayName || '익명의 커플',
          authorPhoto: user.photoURL || '',
          text: commentText.trim(),
          createdAt: new Date().toISOString(),
          likedBy: []
        })
      });
      sendNotification(
        user,
        'comment',
        '내 글에 새로운 댓글 💬',
        `${user.displayName || '상대방'}님: "${commentText.trim().length > 20 ? commentText.trim().substring(0, 20) + '...' : commentText.trim()}"`,
        `post_${postId}`
      );
      // 최신 댓글(최하단) 영역으로 부드럽게 스크롤
      scrollToLatestComment(postId);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // 댓글 삭제 핸들러
  const handleDeleteComment = async (postId, commentId) => {
    if (!db || !user) return;
    const postRef = doc(db, 'posts', postId);

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;
      const commentToRemove = post.comments?.find((c) => c.id === commentId);
      if (!commentToRemove) return;

      await updateDoc(postRef, {
        comments: arrayRemove(commentToRemove)
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // 댓글 수정 핸들러
  const handleUpdateComment = async (postId, commentId, newText) => {
    if (!newText.trim() || !db || !user) return;
    const postRef = doc(db, 'posts', postId);

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;
      const updatedComments = post.comments.map((c) => {
        if (c.id === commentId) {
          return { ...c, text: newText.trim() };
        }
        return c;
      });

      await updateDoc(postRef, {
        comments: updatedComments
      });
      setEditingCommentId(null);
      setEditingText('');
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  // 댓글 좋아요 핸들러
  const handleLikeComment = async (postId, commentId) => {
    if (!db || !user) return;
    const postRef = doc(db, 'posts', postId);

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;
      const updatedComments = post.comments.map((c) => {
        if (c.id === commentId) {
          const likedBy = c.likedBy || [];
          const isLiked = likedBy.includes(user.uid);
          const newLikedBy = isLiked
            ? likedBy.filter((uid) => uid !== user.uid)
            : [...likedBy, user.uid];
          return { ...c, likedBy: newLikedBy };
        }
        return c;
      });

      await updateDoc(postRef, {
        comments: updatedComments
      });
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  // 메인 글 삭제 핸들러
  const handleDeletePost = async (postId) => {
    const isConfirmed = await confirm("정말로 이 소중한 추억을 삭제하시겠습니까?");
    if (!isConfirmed) return;
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 메인 글 수정 핸들러
  const handleUpdatePost = async (postId, newText) => {
    if (!newText.trim() || !db || !user) return;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        text: newText.trim()
      });
      setEditingPostId(null);
      setEditingPostText('');
    } catch (error) {
      console.error('Error updating post:', error);
      alert('글 수정 중 오류가 발생했습니다.');
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

  // 알림 개별 읽음 처리
  const handleNotificationClick = async (notif) => {
    if (!db || !notif.id) return;
    try {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      setIsNotificationsOpen(false);
      if (notif.link) {
        if (notif.link.startsWith('post_')) {
          const postId = notif.link.split('post_')[1];
          setTimeout(() => {
            const postElement = document.getElementById(`post-${postId}`);
            if (postElement) {
              postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setOpenComments(prev => ({ ...prev, [postId]: true }));
            }
          }, 100);
        } else if (notif.link === 'calendar') {
          window.location.pathname = '/calendar';
        }
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllNotificationsAsRead = async () => {
    if (!db) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    try {
      const promises = unread.map(n =>
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      );
      await Promise.all(promises);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const toggleComments = (postId) => {
    setOpenComments((prev) => {
      const nextState = !prev[postId];
      if (nextState) {
        scrollToLatestComment(postId);
      }
      return {
        ...prev,
        [postId]: nextState
      };
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <header className="app-header">
        <h1 className="app-title">Our Moments</h1>
        <button 
          onClick={() => setIsNotificationsOpen(true)} 
          className="notification-bell-btn"
          aria-label="알림 확인"
        >
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </button>
      </header>

      {/* 타임라인 피드 */}
      <div className="feed-container">
        {posts.length === 0 ? (
          <div className="empty-feed">
            <p>아직 등록된 사진이나 글이 없습니다.</p>
            <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>첫 번째 소중한 추억을 공유해 보세요! 👩‍❤️‍👨</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} id={`post-${post.id}`} className="feed-card glass-card">
              <div className="feed-card-header">
                {(() => {
                  const profile = userProfiles[post.authorUid] || {};
                  const name = profile.displayName || post.authorName || '익명의 커플';
                  const photo = profile.photoURL || post.authorPhoto;
                  return (
                    <div
                      className="author-profile-group"
                      onClick={() => handleOpenProfile(post.authorUid, name, photo)}
                      style={{ cursor: 'pointer' }}
                    >
                      {photo ? (
                        <img src={photo} alt="Profile" className="profile-img" />
                      ) : (
                        <div className="profile-fallback">{name[0]}</div>
                      )}
                      <div className="author-info">
                        <span className="author-name">{name}</span>
                        <span className="post-date">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                {post.authorUid === user?.uid && editingPostId !== post.id && (
                  <div className="post-author-actions">
                    <button 
                      onClick={() => {
                        setEditingPostId(post.id);
                        setEditingPostText(post.text);
                      }} 
                      className="post-header-action-btn edit"
                    >
                      수정
                    </button>
                    <button 
                      onClick={() => handleDeletePost(post.id)} 
                      className="post-header-action-btn delete"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>

              {post.imageUrl && (
                <div className="feed-image-wrapper">
                  <img src={post.imageUrl} alt="Post" className="feed-image" />
                </div>
              )}

              <div className="feed-card-content">
                {editingPostId === post.id ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdatePost(post.id, editingPostText);
                    }}
                    className="post-edit-form"
                  >
                    <textarea 
                      value={editingPostText}
                      onChange={(e) => setEditingPostText(e.target.value)}
                      className="post-edit-textarea"
                      rows={3}
                      required
                      autoFocus
                    />
                    <div className="post-edit-actions">
                      <button type="submit" className="post-edit-btn save">저장하기</button>
                      <button type="button" onClick={() => setEditingPostId(null)} className="post-edit-btn cancel">취소</button>
                    </div>
                  </form>
                ) : (
                  <p>{post.text}</p>
                )}
              </div>

              <div className="feed-card-footer">
                <button 
                  onClick={() => handleLike(post.id, post.likedBy)}
                  className={`feed-action-btn ${post.likedBy?.includes(user?.uid) ? 'liked' : ''}`}
                >
                  <Heart size={20} fill={post.likedBy?.includes(user?.uid) ? 'var(--accent)' : 'none'} />
                  <span>{post.hearts || 0}</span>
                </button>
                <button 
                  onClick={() => toggleComments(post.id)}
                  className="feed-action-btn"
                >
                  <MessageCircle size={20} />
                  <span>댓글 {post.comments?.length || 0}</span>
                </button>
              </div>

              {/* 댓글 접기/펴기 영역 */}
              {openComments[post.id] && (
                <div className="comments-section">
                  <div id={`comments-list-${post.id}`} className="comments-list">
                    {(!post.comments || post.comments.length === 0) ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-sub)', padding: '4px 0' }}>첫 번째 댓글을 달아보세요! 💌</p>
                    ) : (
                      (post.comments || []).map((comment) => {
                        const isMyComment = comment.authorUid === user?.uid || comment.id?.startsWith(user?.uid);
                        const commentLiked = comment.likedBy?.includes(user?.uid);
                        
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
                                      handleUpdateComment(post.id, comment.id, editingText);
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

                              {/* 댓글 좋아요 / 수정 / 삭제 버튼 */}
                              {editingCommentId !== comment.id && (
                                <div className="comment-actions-row">
                                  <button 
                                    onClick={() => handleLikeComment(post.id, comment.id)} 
                                    className={`comment-action-btn like ${commentLiked ? 'liked' : ''}`}
                                  >
                                    <Heart size={10} fill={commentLiked ? 'var(--accent)' : 'none'} />
                                    <span>{comment.likedBy?.length || 0}</span>
                                  </button>

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
                                        onClick={() => handleDeleteComment(post.id, comment.id)} 
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
                    )}
                  </div>
                  
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.target.elements.commentInput;
                      handleAddComment(post.id, input.value);
                      input.value = '';
                    }} 
                    className="comment-form"
                  >
                    <input 
                      name="commentInput" 
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
              )}
            </div>
          ))
        )}
      </div>

      {/* 글쓰기 플로팅 버튼 */}
      <button onClick={() => setIsModalOpen(true)} className="fab-btn" aria-label="추억 기록하기">
        <Plus size={28} />
      </button>

      {/* 글쓰기 모달 */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>새로운 추억 남기기</h2>
              <button onClick={() => setIsModalOpen(false)} className="close-btn">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpload}>
              {/* 이미지 미리보기 및 업로드 박스 */}
              <div className="image-upload-area" onClick={() => document.getElementById('post-image-input').click()}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="upload-preview" />
                ) : (
                  <div className="upload-placeholder">
                    <Camera size={32} />
                    <span>추억의 사진 추가하기</span>
                  </div>
                )}
                <input
                  type="file"
                  id="post-image-input"
                  accept="image/*"
                  onChange={handleImageChange}
                  hidden
                />
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="오늘 하루는 어땠나요? 소중한 감상을 적어주세요..."
                rows={4}
                className="modal-textarea"
              />

              <button
                type="submit"
                disabled={uploading || (!text.trim() && !image)}
                className="submit-btn"
              >
                {uploading ? '공유 중...' : '둘만의 피드에 공유하기'}
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
      {/* 알림 히스토리 모달 */}
      {isNotificationsOpen && (
        <div className="modal-overlay" onClick={() => setIsNotificationsOpen(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} className="icon-pink" />
                <h2 style={{ margin: 0 }}>알림 히스토리</h2>
              </div>
              <button onClick={() => setIsNotificationsOpen(false)} className="close-btn">
                <X size={24} />
              </button>
            </div>

            {notifications.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                <button 
                  onClick={handleMarkAllNotificationsAsRead}
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
                    onClick={() => handleNotificationClick(notif)}
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
                onClick={() => setIsNotificationsOpen(false)} 
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

export default Home;
