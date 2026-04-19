import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

export const toggleFavorite = async (user: FirebaseUser, entityId: string, isFavorite: boolean) => {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  try {
    if (isFavorite) {
      await updateDoc(userRef, {
        favorites: arrayRemove(entityId)
      });
    } else {
      await updateDoc(userRef, {
        favorites: arrayUnion(entityId)
      });
    }
  } catch (error) {
    console.error("Error updating favorites:", error);
  }
};

export const fetchFavorites = async (user: FirebaseUser): Promise<string[]> => {
  if (!user) return [];
  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().favorites || [];
  }
  return [];
};
