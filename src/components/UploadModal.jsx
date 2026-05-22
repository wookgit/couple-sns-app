import React from 'react';
import { Camera, Plus, X } from 'lucide-react';

const UploadModal = ({
  isOpen,
  onClose,
  onSubmit,
  text,
  setText,
  imagePreviews,
  uploading,
  onImageChange,
  onRemoveImage
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h2>새로운 추억 남기기</h2>
          <button onClick={onClose} className="close-btn" aria-label="닫기">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={onSubmit}>
          {/* 이미지 미리보기 및 업로드 영역 */}
          {imagePreviews.length === 0 ? (
            <div className="image-upload-area" onClick={() => document.getElementById('post-image-input').click()}>
              <div className="upload-placeholder">
                <Camera size={32} />
                <span>추억의 사진 추가하기 (최대 5장)</span>
              </div>
              <input
                type="file"
                id="post-image-input"
                accept="image/*"
                multiple
                onChange={onImageChange}
                hidden
              />
            </div>
          ) : (
            <div className="image-upload-area-container">
              <div className="image-previews-list">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="upload-preview-item">
                    <img src={preview} alt={`Preview ${idx + 1}`} className="upload-preview-thumbnail" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage(idx);
                      }}
                      className="remove-preview-btn"
                      aria-label="사진 삭제"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <div 
                    className="upload-add-more-btn"
                    onClick={() => document.getElementById('post-image-input').click()}
                  >
                    <Plus size={20} />
                    <span style={{ fontSize: '11px', marginTop: '2px' }}>{imagePreviews.length}/5</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="post-image-input"
                accept="image/*"
                multiple
                onChange={onImageChange}
                hidden
              />
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="오늘 하루는 어땠나요? 소중한 감상을 적어주세요..."
            rows={4}
            className="modal-textarea"
          />

          <button
            type="submit"
            disabled={uploading || (!text.trim() && imagePreviews.length === 0)}
            className="submit-btn"
          >
            {uploading ? '공유 중...' : '둘만의 피드에 공유하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
