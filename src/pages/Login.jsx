import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithRedirect, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, getRedirectResult } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../context/CustomAlertContext';

const Login = () => {
  const { user, loading } = useAuth();
  const { alert } = useAlert();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // 이미 로그인한 사용자는 자동으로 홈으로 리디렉션
  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // 서드파티 쿠키 차단 정책 우회를 위해 signInWithPopup을 기본으로 일괄 적용합니다.
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error("Google Login failed:", error);
      
      // 팝업이 차단된 환경일 경우에만 안전하게 리디렉션 폴백 실행
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error("Redirect login fallback failed:", redirectError);
          alert("구글 로그인에 실패했습니다: " + redirectError.message);
        }
      } else if (error.code === 'auth/operation-not-allowed') {
        alert("🚨 구글 로그인 기능이 활성화되지 않았습니다. Firebase 콘솔 (Authentication -> Sign-in method)에서 Google 제공업체를 활성화해주세요!");
      } else {
        alert("구글 로그인에 실패했습니다: " + error.message);
      }
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error("Email auth failed:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // 계정이 없는 경우 회원가입 유도 또는 에러 처리
        alert("로그인 정보가 올바르지 않거나 계정이 없습니다. 이메일 회원가입을 먼저 진행해 주세요!");
      } else {
        alert("로그인/회원가입에 실패했습니다: " + error.message);
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        <h1 className="app-title" style={{ fontSize: '36px', marginBottom: '10px' }}>Our Moments</h1>
        <p style={{ color: 'var(--text-sub)', marginBottom: '30px' }}>둘만의 프라이빗한 공간에 오신 것을 환영합니다.</p>
        
        {/* 구글 로그인 */}
        <button onClick={handleGoogleLogin} className="login-btn google-btn">
          <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
            </g>
          </svg>
          구글 계정으로 시작하기
        </button>

        <div className="login-divider">
          <span>또는</span>
        </div>

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleEmailAuth} className="email-login-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="modal-input"
            style={{ marginBottom: '10px' }}
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            className="modal-input"
            style={{ marginBottom: '15px' }}
            required
          />
          <button type="submit" className="submit-btn" style={{ marginTop: 0 }}>
            {isSignUp ? '이메일로 회원가입' : '이메일로 로그인'}
          </button>
          
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)} 
            className="signup-toggle-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-sub)',
              fontSize: '12px',
              marginTop: '15px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인하기' : '처음이신가요? 이메일 회원가입하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
