'use client';

import { useEffect, useState } from 'react';
import { doc, setDoc, onSnapshot, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from './firebase-config';

interface UserPresence {
  uid: string;
  displayName: string;
  role: string;
  lastSeen: any;
  online: boolean;
}

export function usePresence(uid: string | null, displayName: string, role: string) {
  useEffect(() => {
    if (!uid) return;

    const presenceRef = doc(db, 'presence', uid);

    // Set online
    setDoc(presenceRef, {
      uid,
      displayName: displayName || 'DIRECTOR',
      role,
      lastSeen: serverTimestamp(),
      online: true,
    }, { merge: true }).catch(() => {});

    // Heartbeat every 30s
    const interval = setInterval(() => {
      setDoc(presenceRef, { lastSeen: serverTimestamp(), online: true }, { merge: true }).catch(() => {});
    }, 30000);

    // Set offline on unload
    const handleUnload = () => {
      // Can't await in unload, but navigator.sendBeacon doesn't work with Firestore
      // So we rely on the staleness check in useOnlineUsers
      setDoc(presenceRef, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      setDoc(presenceRef, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    };
  }, [uid, displayName, role]);
}

export function useOnlineUsers() {
  const [users, setUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'presence'), (snapshot) => {
      const now = Date.now();
      const presenceList: UserPresence[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        const lastSeen = data.lastSeen?.toMillis?.() || 0;
        // Consider offline if no heartbeat in 60s
        const isOnline = data.online && (now - lastSeen < 60000);
        presenceList.push({
          uid: data.uid || doc.id,
          displayName: data.displayName || 'Unknown',
          role: data.role || 'observer',
          lastSeen: data.lastSeen,
          online: isOnline,
        });
      });

      // Sort: online first, then by last seen
      presenceList.sort((a, b) => {
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        return 0;
      });

      setUsers(presenceList);
    }, () => {
      // Firestore listener error — silently handle
    });

    return () => unsubscribe();
  }, []);

  return users;
}
