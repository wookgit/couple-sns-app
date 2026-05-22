import React from 'react';

const InAppToast = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div className="in-app-toast" onClick={onClose}>
      <div className="toast-header">
        <span className="toast-dot" />
        <strong className="toast-title">{toast.title}</strong>
      </div>
      <div className="toast-body">{toast.body}</div>
    </div>
  );
};

export default InAppToast;
