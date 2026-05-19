import { db } from '../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const sendNotification = async (sender, type, title, body, link = '') => {
  if (!db || !sender) return;
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const promises = [];
    usersSnapshot.forEach((userDoc) => {
      const recipientUid = userDoc.id;
      if (recipientUid !== sender.uid) {
        promises.push(
          addDoc(collection(db, 'notifications'), {
            recipientUid,
            senderUid: sender.uid,
            senderName: sender.displayName || '익명의 커플',
            senderPhoto: sender.photoURL || '',
            title,
            body,
            type,
            createdAt: new Date().toISOString(),
            read: false,
            link
          })
        );
      }
    });
    await Promise.all(promises);
  } catch (error) {
    console.error("Error creating notifications:", error);
  }
};
