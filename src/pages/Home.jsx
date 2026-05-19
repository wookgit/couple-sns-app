import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import { Heart, MessageCircle, Camera, Plus, X } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  // Firestore 실시간 데이터 가져오기
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, []);

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
    let imageUrl = '';

    try {
      // 이미지 업로드
      if (image) {
        const imageRef = ref(storage, `posts/${Date.now()}_${image.name}`);
        const snapshot = await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      // Firestore 글 추가
      await addDoc(collection(db, 'posts'), {
        text,
        imageUrl,
        authorName: user?.displayName || '익명의 커플',
        authorPhoto: user?.photoURL || '',
        authorUid: user?.uid,
        createdAt: new Date().toISOString(),
        hearts: 0
      });

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

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <header className="app-header">
        <h1 className="app-title">Our Moments</h1>
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
            <div key={post.id} className="feed-card glass-card">
              <div className="feed-card-header">
                {post.authorPhoto ? (
                  <img src={post.authorPhoto} alt="Profile" className="profile-img" />
                ) : (
                  <div className="profile-fallback">{post.authorName[0]}</div>
                )}
                <div className="author-info">
                  <span className="author-name">{post.authorName}</span>
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

              {post.imageUrl && (
                <div className="feed-image-wrapper">
                  <img src={post.imageUrl} alt="Post" className="feed-image" />
                </div>
              )}

              <div className="feed-card-content">
                <p>{post.text}</p>
              </div>

              <div className="feed-card-footer">
                <button className="feed-action-btn">
                  <Heart size={20} />
                  <span>{post.hearts || 0}</span>
                </button>
                <button className="feed-action-btn">
                  <MessageCircle size={20} />
                  <span>댓글</span>
                </button>
              </div>
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
    </div>
  );
};

export default Home;
