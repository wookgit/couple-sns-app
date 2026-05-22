import { db } from '../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const sendNotification = async (sender, type, title, body, link = '') => {
  if (!db || !sender || !sender.partnerUid) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      recipientUid: sender.partnerUid,
      senderUid: sender.uid,
      senderName: sender.displayName || '익명의 커플',
      senderPhoto: sender.photoURL || '',
      title,
      body,
      type,
      createdAt: new Date().toISOString(),
      read: false,
      link
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
