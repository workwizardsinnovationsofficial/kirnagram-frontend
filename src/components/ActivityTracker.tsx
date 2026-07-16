import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { auth } from "@/firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function pingActivity() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const token = await user.getIdToken();
    await fetch(`${API_BASE}/auth/activity-ping`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Silent fail: tracking must not interrupt app usage.
  }
}

export default function ActivityTracker() {
  const location = useLocation();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        pingActivity();
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    pingActivity();
  }, [location.pathname]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      pingActivity();
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  return null;
}
