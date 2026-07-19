import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { auth } from "@/firebase";
import { MainLayout } from "@/components/layout/MainLayout";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import profileIcon from "@/assets/profileicon.png";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

type SuggestedUser = {
  firebase_uid: string;
  public_id?: string;
  username?: string;
  full_name?: string;
  image_name?: string;
  gender?: string;
};

const SuggestedUsersAll = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isValidImage = (url?: string) =>
    typeof url === "string" &&
    url.trim() !== "" &&
    url.startsWith("http");

  const getAvatar = (user: SuggestedUser) => {
    if (user.image_name && isValidImage(user.image_name)) {
      return user.image_name;
    }
    if (user.gender === "male") return maleIcon;
    if (user.gender === "female") return femaleIcon;
    return profileIcon;
  };

  useEffect(() => {
    const fetchSuggested = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

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
      } finally {
        setLoading(false);
      }
    };

    fetchSuggested();
  }, []);

  const handleFollow = async (targetUid: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setLoadingUser(targetUid);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/follow/send-request/${targetUid}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.filter((user) => user.firebase_uid !== targetUid)
        );
      }
    } catch (error) {
      console.error("Follow failed:", error);
    } finally {
      setLoadingUser(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const username = (user.username || "").toLowerCase();
    const fullName = (user.full_name || "").toLowerCase();
    return username.includes(query) || fullName.includes(query);
  });

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-2xl mx-auto pb-20 md:pb-0 overflow-x-hidden">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90 hover:text-foreground"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <h1 className="mt-2 text-lg font-semibold">Suggested users</h1>

            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search suggested users"
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/35"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading suggestions...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            {searchQuery.trim() ? "No matching users found." : "No suggested users right now."}
          </div>
        ) : (
          <div className="space-y-3 px-4 py-4">
            {filteredUsers.map((user) => {
              const targetId = user.firebase_uid || user.public_id || user.username;
              return (
                <div
                  key={targetId || user.firebase_uid}
                  role="button"
                  tabIndex={0}
                  onClick={() => targetId && navigate(`/user/${targetId}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (targetId) navigate(`/user/${targetId}`);
                    }
                  }}
                  className="w-full rounded-2xl border border-border bg-card p-3 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition"
                >
                <img
                  src={getAvatar(user)}
                  alt={user.username || "User"}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {user.username || user.full_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Suggested for you
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetId = user.firebase_uid || user.public_id || user.username;
                    if (targetId) {
                      void handleFollow(targetId);
                    }
                  }}
                  disabled={loadingUser === user.firebase_uid}
                  className="shrink-0 bg-gradient-to-r from-secondary to-accent text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {loadingUser === user.firebase_uid ? "Following..." : "Follow"}
                </button>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SuggestedUsersAll;
