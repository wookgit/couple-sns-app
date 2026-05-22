import React from 'react';
import { Heart, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import CommentSection from './CommentSection';

const PostCard = ({
  post,
  user,
  userProfiles,
  editingPostId,
  setEditingPostId,
  editingPostText,
  setEditingPostText,
  currentSlides,
  onSliderScroll,
  onSlidePrev,
  onSlideNext,
  onLike,
  onImageLike,
  onDeletePost,
  onUpdatePost,
  onOpenProfile,
  openComments,
  toggleComments,
  editingCommentId,
  setEditingCommentId,
  editingText,
  setEditingText,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
  onLikeComment
}) => {
  const profile = userProfiles[post.authorUid] || {};
  const name = profile.displayName || post.authorName || '익명의 커플';
  const photo = profile.photoURL || post.authorPhoto;

  return (
    <div id={`post-${post.id}`} className="feed-card glass-card">
      <div className="feed-card-header">
        <div
          className="author-profile-group"
          onClick={() => onOpenProfile(post.authorUid, name, photo)}
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
              onClick={() => onDeletePost(post.id)} 
              className="post-header-action-btn delete"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 이미지 슬라이더 (가로 스크롤) */}
      {post.images && post.images.length > 0 ? (
        <div className="feed-images-slider-container">
          <div 
            id={`slider-${post.id}`}
            className="feed-images-slider"
            onScroll={(e) => onSliderScroll(post.id, e)}
          >
            {post.images.map((img, idx) => {
              const isImgLiked = img.likedBy?.includes(user?.uid);
              return (
                <div key={idx} className="feed-image-slide">
                  <img src={img.url} alt={`Post Photo ${idx + 1}`} className="feed-image" />
                  <button
                    type="button"
                    onClick={() => onImageLike(post.id, idx)}
                    className={`feed-image-like-btn ${isImgLiked ? 'liked' : ''}`}
                    aria-label="사진 좋아요"
                  >
                    <Heart size={16} fill={isImgLiked ? 'var(--primary)' : 'none'} />
                    <span>{img.hearts || 0}</span>
                  </button>
                </div>
              );
            })}
          </div>
          {post.images.length > 1 && (
            <>
              <button 
                type="button" 
                onClick={() => onSlidePrev(post.id)}
                className="slider-nav-btn prev"
                aria-label="이전 사진"
                disabled={(currentSlides[post.id] || 0) === 0}
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                type="button" 
                onClick={() => onSlideNext(post.id)}
                className="slider-nav-btn next"
                aria-label="다음 사진"
                disabled={(currentSlides[post.id] || 0) === post.images.length - 1}
              >
                <ChevronRight size={20} />
              </button>
              <div className="slider-indicator-dots">
                {post.images.map((_, dotIdx) => (
                  <span 
                    key={dotIdx} 
                    className={`slider-dot ${(currentSlides[post.id] || 0) === dotIdx ? 'active' : ''}`} 
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : post.imageUrl ? (
        <div className="feed-images-slider-container">
          <div className="feed-images-slider" id={`slider-${post.id}`}>
            <div className="feed-image-slide">
              <img src={post.imageUrl} alt="Post" className="feed-image" />
              <button
                type="button"
                onClick={() => onLike(post.id, post.likedBy)}
                className={`feed-image-like-btn ${post.likedBy?.includes(user?.uid) ? 'liked' : ''}`}
                aria-label="사진 좋아요"
              >
                <Heart size={16} fill={post.likedBy?.includes(user?.uid) ? 'var(--primary)' : 'none'} />
                <span>{post.hearts || 0}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="feed-card-content">
        {editingPostId === post.id ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              onUpdatePost(post.id, editingPostText);
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
          onClick={() => onLike(post.id, post.likedBy)}
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
        <CommentSection
          postId={post.id}
          comments={post.comments}
          user={user}
          userProfiles={userProfiles}
          editingCommentId={editingCommentId}
          setEditingCommentId={setEditingCommentId}
          editingText={editingText}
          setEditingText={setEditingText}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onUpdateComment={onUpdateComment}
          onLikeComment={onLikeComment}
          onOpenProfile={onOpenProfile}
        />
      )}
    </div>
  );
};

export default PostCard;
