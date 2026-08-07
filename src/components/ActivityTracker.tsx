import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { auth } from "@/firebase";
import { getAuthToken } from "@/lib/auth-utils";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function pingActivity() {
  const token = await getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/auth/activity-ping`, {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      console.warn("Activity ping failed", res.status);
    }
  } catch (error) {
    // Silent fail: tracking must not interrupt app usage.
    console.warn("Activity ping error", error);
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
