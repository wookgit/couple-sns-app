import React, { createContext, useContext, useState } from 'react';

const CustomAlertContext = createContext();

export const useAlert = () => useContext(CustomAlertContext) || {
  alert: (msg) => { window.alert(msg); return Promise.resolve(true); },
  confirm: (msg) => Promise.resolve(window.confirm(msg))
};

export const CustomAlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: '',
    type: 'alert', // 'alert' | 'confirm'
    resolve: null
  });

  const showAlert = (message) => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        message,
        type: 'alert',
        resolve
      });
    });
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        message,
        type: 'confirm',
        resolve
      });
    });
  };

  const handleClose = (value) => {
    if (alertState.resolve) {
      alertState.resolve(value);
    }
    setAlertState({
      isOpen: false,
      message: '',
      type: 'alert',
      resolve: null
    });
  };

  return (
    <CustomAlertContext.Provider value={{ alert: showAlert, confirm: showConfirm }}>
      {children}
      {alertState.isOpen && (
        <div className="custom-alert-overlay">
          <div className="custom-alert-content glass-card">
            <div className="custom-alert-body">
              <p>{alertState.message}</p>
            </div>
            <div className="custom-alert-actions">
              {alertState.type === 'confirm' ? (
                <>
                  <button 
                    onClick={() => handleClose(true)} 
                    className="custom-alert-btn confirm-ok"
                  >
                    확인
                  </button>
                  <button 
                    onClick={() => handleClose(false)} 
                    className="custom-alert-btn confirm-cancel"
                  >
                    취소
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleClose(true)} 
                  className="custom-alert-btn alert-ok"
                >
                  확인
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </CustomAlertContext.Provider>
  );
};
