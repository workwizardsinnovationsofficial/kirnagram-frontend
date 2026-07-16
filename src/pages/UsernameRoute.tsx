import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { auth } from "@/firebase";
import NotFound from "./NotFound";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const UsernameRoute = () => {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const checkUsername = async () => {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        
        // Call backend to find user by username
        const res = await fetch(`${API_BASE}/profile/username/${encodeURIComponent(username)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUserId(data.firebase_uid);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Failed to lookup username:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    checkUsername();
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return <NotFound />;
  }

  if (userId) {
    // Redirect to the standard /user/:userId route
    return <Navigate to={`/user/${userId}`} replace />;
  }

  return <NotFound />;
};

export default UsernameRoute;
