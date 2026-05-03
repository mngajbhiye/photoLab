// hooks/useRemoveBgQuota.ts
// Tracks how many remove-bg requests a user has made today.
// Stored in Firestore: users/{uid}/quota/{YYYY-MM-DD} → { count: number }
// Quota resets automatically each day (new document key = new day).

import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { useAuth } from "../context/AuthContext.tsx";

const DAILY_LIMIT = 50;

// Returns today's date key in YYYY-MM-DD (user's local timezone)
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

type QuotaResult = {
  used:         number;            // requests used today
  remaining:    number;            // requests left today
  limitReached: boolean;           // true when used >= DAILY_LIMIT
  consume:      () => Promise<boolean>; // call before each remove-bg request
                                        // returns false if limit already reached
  loading:      boolean;
};

export function useRemoveBgQuota(): QuotaResult {
  const { user } = useAuth();
  const [used,    setUsed]    = useState(0);
  const [loading, setLoading] = useState(true);

  const quotaDocRef = user
    ? doc(db, "users", user.uid, "quota", todayKey())
    : null;

  // Load today's count on mount / when user changes
  useEffect(() => {
    if (!quotaDocRef) { setLoading(false); return; }

    getDoc(quotaDocRef).then((snap) => {
      setUsed(snap.exists() ? (snap.data().count as number) : 0);
      setLoading(false);
    });
  }, [user?.uid]);

  // Call before each remove-bg API hit.
  // Atomically increments the Firestore counter and updates local state.
  const consume = async (): Promise<boolean> => {
    if (!quotaDocRef || used >= DAILY_LIMIT) return false;

    // Optimistic local update — rolls back if Firestore write fails
    setUsed(prev => prev + 1);

    try {
      await setDoc(
        quotaDocRef,
        {
          count:     increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true },       // creates doc if missing, merges if present
      );
      return true;
    } catch {
      setUsed(prev => prev - 1); // rollback on error
      return false;
    }
  };

  return {
    used,
    remaining:    Math.max(0, DAILY_LIMIT - used),
    limitReached: used >= DAILY_LIMIT,
    consume,
    loading,
  };
}