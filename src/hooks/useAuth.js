import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Firestore에서 유저 프로필 정보를 실시간 연동 (Auth photoURL 용량 한계 극복)
        const userRef = doc(db, 'users', currentUser.uid);
        // 이메일 정보를 Firestore 문서에 병합하여 상대방도 볼 수 있도록 합니다.
        setDoc(userRef, { email: currentUser.email }, { merge: true }).catch(err => {
          console.error("Error updating user email in firestore:", err);
        });

        unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({
              ...currentUser,
              ...data, // Firestore의 모든 필드 (partnerUid, connectionCode 등)를 포함시킵니다.
              displayName: data.displayName || currentUser.displayName,
              photoURL: data.photoURL || currentUser.photoURL,
              uid: currentUser.uid,
              email: currentUser.email
            });
          } else {
            // Firestore에 아직 프로필 문서가 없는 경우 Auth의 기본 데이터 제공
            setUser(currentUser);
          }
          setLoading(false);
        }, (err) => {
          console.error("Error loading Firestore user doc:", err);
          setUser(currentUser);
          setLoading(false);
        });
      } else {
        if (unsubDoc) unsubDoc();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { user, loading };
};
