import React from 'react';
import { Heart, Send } from 'lucide-react';

const CommentSection = ({
  postId,
  comments,
  user,
  userProfiles,
  editingCommentId,
  setEditingCommentId,
  editingText,
  setEditingText,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
  onLikeComment,
  onOpenProfile
}) => {
  return (
    <div className="comments-section">
      <div id={`comments-list-${postId}`} className="comments-list">
        {(!comments || comments.length === 0) ? (
          <p style={{ fontSize: '12px', color: 'var(--text-sub)', padding: '4px 0' }}>첫 번째 댓글을 달아보세요! 💌</p>
        ) : (
          [...(comments || [])]
            .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
            .map((comment) => {
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
                    onClick={() => onOpenProfile(comment.authorUid, cName, cPhoto)}
                    style={{ cursor: 'pointer' }}
                  />
                ) : (
                  <div
                    className="comment-avatar-fallback"
                    onClick={() => onOpenProfile(comment.authorUid, cName, cPhoto)}
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
                          onUpdateComment(postId, comment.id, editingText);
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
                          onClick={() => onOpenProfile(comment.authorUid, cName, cPhoto)}
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
                        onClick={() => onLikeComment(postId, comment.id)} 
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
                            onClick={() => onDeleteComment(postId, comment.id)} 
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
          onAddComment(postId, input.value);
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
  );
};

export default CommentSection;
