import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import profileIcon from "@/assets/profileicon.png";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.kirnagram.com";

type SuggestedUser = {
  firebase_uid: string;
  username?: string;
  full_name?: string;
  image_name?: string;
  gender?: string;
};

type SuggestedUsersProps = {
  onOpenProfile?: (id: string) => void;
};

const SuggestedUsers = ({ onOpenProfile }: SuggestedUsersProps) => {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const navigate = useNavigate();

  const isValidImage = (url?: string) =>
    typeof url === "string" &&
    url.trim() !== "" &&
    url.startsWith("http");

  const getAvatar = (user: SuggestedUser) => {
    if (user.image_name && isValidImage(user.image_name))
      return user.image_name;
    if (user.gender === "male") return maleIcon;
    if (user.gender === "female") return femaleIcon;
    return profileIcon;
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSuggested = async () => {
      if (!currentUser) return;

      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/profile/users/suggested`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load suggestions");

        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Suggested users error:", error);
        setUsers([]);
      }
    };

    fetchSuggested();
  }, [currentUser]);

  const handleFollow = async (user: SuggestedUser) => {
    if (!currentUser) return;
    const targetUid = user.firebase_uid || user.username;
    if (!targetUid) return;

    setLoadingUser(targetUid);

    try {
      const token = await currentUser.getIdToken();

      const res = await fetch(
        `${API_BASE}/follow/send-request/${encodeURIComponent(targetUid)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setUsers((prev) =>
          prev.filter((u) => (u.firebase_uid || u.username) !== targetUid)
        );
      }
    } catch (error) {
      console.error("Follow failed:", error);
    } finally {
      setLoadingUser(null);
    }
  };

  if (users.length === 0) return null;

  const getTargetUserId = (target: SuggestedUser | string) => {
    if (typeof target === "string") return target;
    return target.firebase_uid || target.public_id || target.username;
  };

  const openUserProfile = (target: SuggestedUser | string) => {
    const targetId = getTargetUserId(target);
    if (!targetId) return;

    if (onOpenProfile) {
      onOpenProfile(targetId);
      return;
    }

    navigate(`/user/${targetId}`);
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">
          Suggested for you
        </h3>
        <button
          type="button"
          onClick={() => navigate("/suggested-users")}
          className="text-sm font-medium text-primary hover:opacity-80 transition"
        >
          See all
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {users.map((user) => (
          <div
            key={user.firebase_uid || user.username}
            role="button"
            tabIndex={0}
            onClick={() => openUserProfile(user)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openUserProfile(user);
              }
            }}
            className="bg-card border border-border rounded-2xl p-4 min-w-[220px] flex flex-col items-center shadow-sm cursor-pointer"
          >
            <div className="w-full flex justify-end">
              <button
                className="text-muted-foreground text-sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUsers((prev) =>
                    prev.filter((u) => u.firebase_uid !== user.firebase_uid)
                  );
                }}
              >
                ✕
              </button>
            </div>

            <img
              src={getAvatar(user)}
              alt={user.username || "User"}
              className="w-24 h-24 rounded-full object-cover mb-3 cursor-pointer"
              onClick={() => openUserProfile(user)}
            />

            <p className="font-semibold text-sm text-center cursor-pointer">
              {user.username || user.full_name || "User"}
            </p>

            <p className="text-xs text-muted-foreground text-center mt-1">
              Suggested for you
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleFollow(user);
              }}
              disabled={loadingUser === (user.firebase_uid || user.username)}
              className="mt-4 w-full bg-gradient-to-r from-secondary to-accent text-secondary-foreground py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingUser === (user.firebase_uid || user.username) ? (
                "Following..."
              ) : (
                <>
                  {/* Optionally add an icon here, e.g., a plus icon */}
                  {/* <svg className=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" d=\"M12 4v16m8-8H4\" /></svg> */}
                  Follow
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestedUsers;
