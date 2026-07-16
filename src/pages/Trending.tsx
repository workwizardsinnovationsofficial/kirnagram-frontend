import React, { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Search, Heart, Eye } from "lucide-react";
import { auth } from "@/firebase";
import { useNavigate } from "react-router-dom";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";

const API_BASE = "http://127.0.0.1:8000";

type Post = {
  _id: string;
  user_id?: string;
  prompt_id?: string;
  prompt_badge?: string;
  image_url?: string;
  likes?: string[];
  views?: string[];
  remix_count?: number;
  created_at?: string;
  is_prompt_post?: boolean;
};

type UserSummary = {
  firebase_uid: string;
  username?: string;
  full_name?: string;
  public_id?: string;
  image_name?: string;
  gender?: string;
};

export default function Trending() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserSummary>>({});
  const navigate = useNavigate();

  useEffect(() => auth.onAuthStateChanged((u) => setCurrentUser(u)), []);

  useEffect(() => {
    const fetchTrending = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/posts/explore?page=1&limit=200`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const postsData = Array.isArray(data.posts) ? data.posts : [];
        const remixPosts = postsData.filter((p) => p.is_prompt_post);
        remixPosts.sort((a: any, b: any) => (Number(b.remix_count || 0) - Number(a.remix_count || 0)) || (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
        setPosts(remixPosts);
      } catch (e) {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, [currentUser]);

  useEffect(() => {
    const loadProfiles = async () => {
      if (!currentUser || posts.length === 0) return;
      const ids = Array.from(new Set(posts.map((p) => p.user_id).filter(Boolean))) as string[];
      const missingIds = ids.filter((id) => !userProfiles[id]);
      if (missingIds.length === 0) return;

      try {
        const token = await currentUser.getIdToken();
        const results: Record<string, UserSummary> = {};
        await Promise.all(
          missingIds.map(async (id) => {
            try {
              const res = await fetch(`${API_BASE}/profile/user/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.status === 403) {
                results[id] = { firebase_uid: id, username: "Private User" };
                return;
              }
              if (!res.ok) throw new Error("Failed");
              const data = await res.json();
              results[id] = data;
            } catch {
              results[id] = { firebase_uid: id, username: `user${id.slice(-4)}` };
            }
          })
        );
        setUserProfiles((prev) => ({ ...prev, ...results }));
      } catch {
        // ignore profile load failure
      }
    };
    loadProfiles();
  }, [currentUser, posts, userProfiles]);

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(".0", "") + "K";
    }
    return count.toString();
  };

  const getFallbackProfileImage = (user: UserSummary | any) => {
    if (user?.gender === "male") return maleIcon;
    if (user?.gender === "female") return femaleIcon;
    return profileIcon;
  };

  const getProfileImage = (user: UserSummary | any) => {
    const img = user?.image_name as string | undefined;
    if (typeof img === "string" && img.trim() !== "") {
      if (img.startsWith("http")) return img;
      return `${API_BASE}/profile/avatar/${img}`;
    }
    return getFallbackProfileImage(user);
  };

  const getDisplayName = (user: UserSummary | any) => {
    return user?.full_name || user?.username || user?.public_id || "Creator";
  };

  const handleUserRedirect = (userId?: string) => {
    if (!userId) return;
    navigate(`/user/${userId}`);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return posts;
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const badge = String(p.prompt_badge || "").toLowerCase();
      const pid = String(p.prompt_id || "").toLowerCase();
      return badge.includes(q) || pid.includes(q);
    });
  }, [posts, query]);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-lg border border-border bg-card">Back</button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by prompt id or badge..."
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-card"
            />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-muted-foreground">Loading trending remixes...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground">No remixes found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map((p) => {
                const author = p.user_id ? userProfiles[p.user_id] : undefined;
                const avatar = author ? getProfileImage(author) : profileIcon;
                return (
                  <div key={p._id} className="rounded-2xl overflow-hidden border border-border bg-card cursor-pointer" onClick={() => p.prompt_id && navigate(`/remix/${p.prompt_id}`)}>
                    <img src={p.image_url || "/broken-image.png"} alt={p.prompt_badge || "Remix"} className="w-full h-48 object-cover" />
                    <div className="p-3 space-y-2">
                      <div>
                        <div className="text-sm font-semibold truncate">{p.prompt_badge || "Remix"}</div>
                        <div className="text-[11px] text-muted-foreground">{Number(p.remix_count || 0)} remixes</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (author?.firebase_uid) handleUserRedirect(author.firebase_uid);
                        }}
                        className="flex items-center gap-2 text-left w-full"
                      >
                        <img
                          src={avatar}
                          alt={getDisplayName(author)}
                          className="w-8 h-8 rounded-full object-cover border border-border"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = profileIcon;
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{getDisplayName(author)}</p>
                          <p className="text-[11px] text-muted-foreground truncate">@{author?.username || author?.public_id || getDisplayName(author).toLowerCase().replace(/\s+/g, "")}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          {formatCount(Number(p.likes?.length || 0))}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-yellow-300" />
                          {formatCount(Number(p.views?.length || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
