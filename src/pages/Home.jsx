import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/CustomAlertContext';
import { Plus, Bell } from 'lucide-react';
import { sendNotification } from '../services/notificationService';

// 분할된 컴포넌트 임포트
import PostCard from '../components/PostCard';
import UploadModal from '../components/UploadModal';
import ProfileModal from '../components/ProfileModal';
import NotificationsModal from '../components/NotificationsModal';
import InAppToast from '../components/InAppToast';

const Home = () => {
  const { user } = useAuth();
  const { alert, confirm } = useAlert();
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [openComments, setOpenComments] = useState({}); // { [postId]: true/false }
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostText, setEditingPostText] = useState('');
  const [userProfiles, setUserProfiles] = useState({});
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [currentSlides, setCurrentSlides] = useState({}); // { [postId]: activeIndex }

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
  const [activeToast, setActiveToast] = useState(null);
  const isInitialNotifs = useRef(true);

  // 실시간 알림 목록 불러오기 및 푸시 트리거
  useEffect(() => {
    if (!db || !user) return;
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', user.uid)
    );
    
    isInitialNotifs.current = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      // 인덱스 생성 오류 방지를 위해 메모리상에서 정렬
      notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(notifs);

      // 마운트 이후 실시간으로 수신되는 읽지 않은 상대방의 알림에 대해 브라우저 푸시 알림 트리거
      if (!isInitialNotifs.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newNotif = change.doc.data();
            if (newNotif.senderUid !== user.uid && !newNotif.read) {
              triggerPushNotification(
                newNotif.title || "새로운 알림 💖",
                newNotif.body || ""
              );
            }
          }
        });
      } else {
        isInitialNotifs.current = false;
      }
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

  // 첫 페이지 마운트 시 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 인앱 토스트 알림 자동 만료 타이머
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // 브라우저 네이티브 알림 발송 함수 (서비스 워커 백그라운드 푸시 연동) 및 인앱 토스트
  const triggerPushNotification = (title, body) => {
    // 1. 인앱 실시간 알림 토스트 트리거
    setActiveToast({ title, body });

    // 2. 브라우저/OS 네이티브 푸시 알림 트리거
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200]
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/favicon.svg' });
        });
      } catch (err) {
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    }
  };

  // Firestore 실시간 데이터 가져오기
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
      
      // createdAt 기준 내림차순 정렬 (최신순)
      postsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newImages = [...images, ...files].slice(0, 5);
      setImages(newImages);
      const newPreviews = newImages.map((file) => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
    }
  };

  const removeSelectedImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!text.trim() && images.length === 0) return;

    setUploading(true);
    let finalImageUrl = '';
    let compressedImages = [];

    try {
      // 이미지 업로드 대신, 브라우저에서 초경량 압축 후 Base64 문자열로 직접 변환
      if (images.length > 0) {
        for (const file of images) {
          const compressed = await compressAndConvertToBase64(file);
          compressedImages.push({
            url: compressed,
            likedBy: [],
            hearts: 0
          });
        }
        finalImageUrl = compressedImages[0]?.url || '';
      }

      // Firestore 글 추가 (Storage를 전혀 거치지 않고 직접 이미지 저장)
      const docRef = await addDoc(collection(db, 'posts'), {
        text,
        imageUrl: finalImageUrl,
        images: compressedImages,
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
      setImages([]);
      setImagePreviews([]);
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

  // 개별 사진 좋아요 토글 핸들러
  const handleImageLike = async (postId, imageIndex) => {
    if (!db || !user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post || !post.images || !post.images[imageIndex]) return;

    const updatedImages = [...post.images];
    const targetImage = { ...updatedImages[imageIndex] };
    const imageLikedBy = targetImage.likedBy || [];
    const isLiked = imageLikedBy.includes(user.uid);

    if (isLiked) {
      targetImage.likedBy = imageLikedBy.filter((uid) => uid !== user.uid);
      targetImage.hearts = Math.max(0, (targetImage.hearts || 1) - 1);
    } else {
      targetImage.likedBy = [...imageLikedBy, user.uid];
      targetImage.hearts = (targetImage.hearts || 0) + 1;
    }
    updatedImages[imageIndex] = targetImage;

    const postRef = doc(db, 'posts', postId);
    try {
      await updateDoc(postRef, {
        images: updatedImages
      });
      if (!isLiked) {
        sendNotification(
          user,
          'heart',
          '사진에 좋아요 💖',
          `${user.displayName || '상대방'}님이 내 사진에 소중한 마음(좋아요)을 남겼습니다!`,
          `post_${postId}`
        );
      }
    } catch (error) {
      console.error('Error toggling image like:', error);
    }
  };

  // 이미지 슬라이더 스크롤 이벤트 핸들러
  const handleSliderScroll = (postId, e) => {
    const slider = e.target;
    const scrollIndex = Math.round(slider.scrollLeft / slider.clientWidth);
    setCurrentSlides((prev) => ({ ...prev, [postId]: scrollIndex }));
  };

  // 이미지 슬라이더 이전/다음 이동 핸들러 (PC 웹 클릭용)
  const handleSlidePrev = (postId) => {
    const slider = document.getElementById(`slider-${postId}`);
    if (slider) {
      slider.scrollBy({ left: -slider.clientWidth, behavior: 'smooth' });
    }
  };

  const handleSlideNext = (postId) => {
    const slider = document.getElementById(`slider-${postId}`);
    if (slider) {
      slider.scrollBy({ left: slider.clientWidth, behavior: 'smooth' });
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
            <PostCard
              key={post.id}
              post={post}
              user={user}
              userProfiles={userProfiles}
              editingPostId={editingPostId}
              setEditingPostId={setEditingPostId}
              editingPostText={editingPostText}
              setEditingPostText={setEditingPostText}
              currentSlides={currentSlides}
              onSliderScroll={handleSliderScroll}
              onSlidePrev={handleSlidePrev}
              onSlideNext={handleSlideNext}
              onLike={handleLike}
              onImageLike={handleImageLike}
              onDeletePost={handleDeletePost}
              onUpdatePost={handleUpdatePost}
              onOpenProfile={handleOpenProfile}
              openComments={openComments}
              toggleComments={toggleComments}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
              editingText={editingText}
              setEditingText={setEditingText}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onUpdateComment={handleUpdateComment}
              onLikeComment={handleLikeComment}
            />
          ))
        )}
      </div>

      {/* 글쓰기 플로팅 버튼 */}
      <button onClick={() => setIsModalOpen(true)} className="fab-btn" aria-label="추억 기록하기">
        <Plus size={28} />
      </button>

      {/* 글쓰기 모달 */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUpload}
        text={text}
        setText={setText}
        imagePreviews={imagePreviews}
        uploading={uploading}
        onImageChange={handleImageChange}
        onRemoveImage={removeSelectedImage}
      />

      {/* 프로필 상세 보기 모달 */}
      <ProfileModal
        selectedProfileUser={selectedProfileUser}
        onClose={() => setSelectedProfileUser(null)}
      />

      {/* 알림 히스토리 모달 */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onNotificationClick={handleNotificationClick}
      />

      {/* 인앱 실시간 알림 토스트 */}
      <InAppToast
        toast={activeToast}
        onClose={() => setActiveToast(null)}
      />
    </div>
  );
};

export default Home;
