import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, ChevronLeft, RefreshCw, Volume2, VolumeX } from "lucide-react";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import { BottomNav } from "@/components/layout/BottomNav";
import { auth } from "@/firebase";

const API_BASE = "http://127.0.0.1:8000";

/* ================= TYPES ================= */

interface Post {
  _id: string;
  user_id: string;
  image_url?: string;
  video_url?: string;
  caption?: string;
  likes?: string[];
  comments?: any[];
  created_at?: string;
}

interface UserProfile {
  firebase_uid: string;
  username?: string;
  image_name?: string;
  gender?: string;
}

/* ================= COMPONENT ================= */

const DiscoverView: React.FC = () => {
  const navigate = useNavigate();


  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [followStatusByUser, setFollowStatusByUser] = useState<Record<string, "none" | "requested" | "following">>({});
  const [followLoadingByUser, setFollowLoadingByUser] = useState<Record<string, boolean>>({});
  const [avatarLoadFailedByUser, setAvatarLoadFailedByUser] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showHeart, setShowHeart] = useState<number | null>(null);
  const [soundIndicator, setSoundIndicator] = useState<{ index: number; muted: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeComments, setActiveComments] = useState<any[]>([]);
  const [likesOpen, setLikesOpen] = useState(false);
  const [activeLikeUsers, setActiveLikeUsers] = useState<any[]>([]);
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});

  // Infinite scroll states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const didApplyInitialPostScrollRef = useRef(false);
  const lastTapRef = useRef<{ time: number; postId: string } | null>(null);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ================= FETCH POSTS ================= */


  // 🔥 Load Posts Function
  const loadPosts = async (pageNumber = 1, replace = false) => {
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();

    const res = await fetch(
      `${API_BASE}/posts/feed?page=${pageNumber}&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    const filtered = (data || [])
      .filter((p: any) => !p.is_prompt_post)
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

    setHasMore(filtered.length >= 5);

    if (replace) {
      setPosts(filtered);
      setPage(1);
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: 0, behavior: "auto" });
        }
        setCurrentIndex(0);
      }, 0);
    } else {
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p._id));
        const next = filtered.filter((p: Post) => !seen.has(p._id));
        return [...prev, ...next];
      });
    }
  };

  // 🔥 Initial Load
  useEffect(() => {
    loadPosts(1, true);
    // eslint-disable-next-line
  }, []);

  /* ================= LOAD PROFILES ================= */

  useEffect(() => {
    const loadProfiles = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const ids = Array.from(new Set(posts.map((p) => p.user_id)));

      await Promise.all(
        ids.map(async (id) => {
          if (!profiles[id]) {
            const profileRes = await fetch(`${API_BASE}/profile/user/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const profileData = await profileRes.json();
            setProfiles((prev) => ({ ...prev, [id]: profileData }));
          }

          if (id !== user.uid && !followStatusByUser[id]) {
            const followRes = await fetch(`${API_BASE}/follow/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (followRes.ok) {
              const followData = await followRes.json();
              setFollowStatusByUser((prev) => ({
                ...prev,
                [id]: followData?.follow_status || "none",
              }));
            }
          }
        })
      );
    };

    if (posts.length) loadProfiles();
  }, [posts, followStatusByUser, profiles]);

  /* ================= SCROLL SNAP ================= */


  // 🔥 Infinite Scroll & Pull to Refresh
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const index = Math.round(scrollTop / clientHeight);
    setCurrentIndex(index);

    // 🔥 Load more when near bottom
    if (
      scrollTop + clientHeight >= scrollHeight - 200 &&
      hasMore &&
      !loadingMore
    ) {
      const nextPage = page + 1;
      setLoadingMore(true);
      setPage(nextPage);
      loadPosts(nextPage).finally(() => setLoadingMore(false));
    }
    // No restriction on scroll direction: user can scroll up and down freely
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPosts(1, true);
    } finally {
      setRefreshing(false);
    }
  };

  /* ================= AUTO PLAY ================= */

  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (!video) return;

      if (idx === currentIndex) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex]);

  // 🔥 FIX 3 — Scroll to Clicked Post Correctly
  // If navigated with postId param, scroll to that post
  // (Assumes you use useParams for postId)
  // If not already present, add:
  // import { useParams } from "react-router-dom";
  // const { postId } = useParams();
  // ...
  // Add this effect:
  // (If useParams is not imported, add it at the top)
  //
  // (Below is the effect)
  //
  // @ts-ignore
  const postId = (window.location.pathname.match(/discoverview\/(\w+)/)?.[1]) || null;
  useEffect(() => {
    if (didApplyInitialPostScrollRef.current) return;
    if (!postId || posts.length === 0) return;

    const index = posts.findIndex((p) => p._id === postId);
    if (index !== -1 && containerRef.current) {
      containerRef.current.scrollTo({
        top: index * window.innerHeight,
        behavior: "auto",
      });
      setCurrentIndex(index);
      didApplyInitialPostScrollRef.current = true;
    }
  }, [postId, posts]);

  /* ================= PROFILE IMAGE ================= */

  const getProfileFallbackIcon = (user?: UserProfile) => {
    if (user?.gender === "male") return maleIcon;
    if (user?.gender === "female") return femaleIcon;
    return profileIcon;
  };

  const resolveProfileImageUrl = (imageName?: string) => {
    if (!imageName) return null;

    const trimmed = imageName.trim();
    if (!trimmed) return null;

    if (/^data:image\//i.test(trimmed)) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("//")) return `${window.location.protocol}${trimmed}`;

    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${API_BASE}${normalizedPath}`;
  };

  const getProfileImage = (userId: string, user?: UserProfile) => {
    if (avatarLoadFailedByUser[userId]) return getProfileFallbackIcon(user);
    return resolveProfileImageUrl(user?.image_name) || getProfileFallbackIcon(user);
  };

  /* ================= LIKE ================= */

  const handleLike = async (postId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();

    await fetch(`${API_BASE}/posts/like/${postId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? {
              ...p,
              likes: p.likes?.includes(user.uid)
                ? p.likes.filter((id) => id !== user.uid)
                : [...(p.likes || []), user.uid],
            }
          : p
      )
    );
  };

  const handleToggleFollow = async (targetUid: string) => {
    const user = auth.currentUser;
    if (!user || !targetUid || user.uid === targetUid) return;

    const currentStatus = followStatusByUser[targetUid] || "none";
    setFollowLoadingByUser((prev) => ({ ...prev, [targetUid]: true }));

    try {
      const token = await user.getIdToken();
      if (currentStatus === "following" || currentStatus === "requested") {
        const res = await fetch(`${API_BASE}/follow/unfollow/${targetUid}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setFollowStatusByUser((prev) => ({ ...prev, [targetUid]: "none" }));
        }
      } else {
        const res = await fetch(`${API_BASE}/follow/send-request/${targetUid}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const nextStatus = data?.follow_status === "following" ? "following" : "requested";
          setFollowStatusByUser((prev) => ({ ...prev, [targetUid]: nextStatus }));
        }
      }
    } finally {
      setFollowLoadingByUser((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  const getHandleText = (user?: { username?: string; public_id?: string; }) => {
    if (!user) return "@user";
    if (user.username) {
      return user.username.startsWith("@") ? user.username : `@${user.username}`;
    }
    if (user.public_id) {
      return user.public_id.startsWith("@") ? user.public_id : `@${user.public_id}`;
    }
    return "@user";
  };

  const getDisplayName = (user?: { full_name?: string; username?: string; public_id?: string; }) => {
    if (!user) return "User";
    return user.full_name || user.username || user.public_id || "User";
  };

  /* ================= DOUBLE TAP ================= */

  const handleDoubleTap = (post: Post, index: number) => {
    const currentUserId = auth.currentUser?.uid || "";
    const alreadyLiked = post.likes?.includes(currentUserId);

    if (!alreadyLiked) {
      handleLike(post._id);
    }

    setShowHeart(index);
    setTimeout(() => setShowHeart(null), 600);
  };

  const showSoundFeedback = (index: number, nextMuted: boolean) => {
    setSoundIndicator({ index, muted: nextMuted });

    if (soundIndicatorTimeoutRef.current) {
      clearTimeout(soundIndicatorTimeoutRef.current);
    }

    soundIndicatorTimeoutRef.current = setTimeout(() => {
      setSoundIndicator(null);
    }, 850);
  };

  const handleVideoTap = (post: Post, index: number) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;
    const isDoubleTap =
      lastTap &&
      lastTap.postId === post._id &&
      now - lastTap.time < 280;

    if (isDoubleTap) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = null;
      handleDoubleTap(post, index);
      return;
    }

    lastTapRef.current = { time: now, postId: post._id };

    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current);
    }

    singleTapTimeoutRef.current = setTimeout(() => {
      setMuted((prevMuted) => {
        const nextMuted = !prevMuted;
        showSoundFeedback(index, nextMuted);
        return nextMuted;
      });
    }, 280);
  };

  const handleNonVideoTap = (post: Post, index: number) => {
    const now = Date.now();
    const lastTap = lastTapRef.current;
    const isDoubleTap =
      lastTap &&
      lastTap.postId === post._id &&
      now - lastTap.time < 280;

    if (isDoubleTap) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = null;
      handleDoubleTap(post, index);
      return;
    }

    lastTapRef.current = { time: now, postId: post._id };
  };

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
      if (soundIndicatorTimeoutRef.current) {
        clearTimeout(soundIndicatorTimeoutRef.current);
      }
    };
  }, []);

  /* ================= COMMENTS ================= */

  const openComments = async (postId: string) => {
    const res = await fetch(`${API_BASE}/posts/comments/${postId}`);
    const data = await res.json();
    setActiveComments(data.comments || []);
    setCommentsOpen(true);
  };

  const openLikes = async (postId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    try {
      const res = await fetch(`${API_BASE}/posts/likes/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load likes");

      const data = await res.json();
      setActiveLikeUsers(Array.isArray(data.likes) ? data.likes : []);
    } catch {
      setActiveLikeUsers([]);
    }

    setLikesOpen(true);
  };

  /* ================= SHARE ================= */

  const handleShare = async (post: Post) => {
    const url = `${window.location.origin}/discoverview/${post._id}`;

    if (navigator.share) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="h-screen bg-background relative overflow-hidden">

      {/* Back Button */}
      <div className="absolute top-5 left-4 z-30">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="text-foreground w-7 h-7" />
        </button>
      </div>

      <div className="absolute top-5 right-4 z-30">
        <button onClick={handleRefresh} className="text-foreground/90">
          <RefreshCw className={`w-6 h-6 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* REELS CONTAINER */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth pb-28"
      >
        {posts.map((post, idx) => {
          const isLiked = post.likes?.includes(auth.currentUser?.uid || "");

          return (
            <div
              key={post._id}
              className="snap-start relative h-screen flex items-center justify-center px-0 md:px-6"
            >
              <div
                className="relative h-full w-full bg-background md:h-[92vh] md:max-w-[430px] md:rounded-2xl md:overflow-hidden md:border md:border-border md:shadow-2xl"
              >
                <div className="absolute inset-0 flex items-center justify-center bg-background">
                  {post.video_url ? (
                    <video
                      ref={(el) => (videoRefs.current[idx] = el)}
                      src={post.video_url}
                      muted={muted}
                      playsInline
                      loop
                      className="h-full w-full object-cover md:object-contain"
                      onClick={() => handleVideoTap(post, idx)}
                    />
                  ) : post.image_url ? (
                    <img
                      src={post.image_url}
                      className="h-full w-full object-cover md:object-contain"
                      onClick={() => handleNonVideoTap(post, idx)}
                    />
                  ) : (
                    <div
                      className="h-full w-full flex items-center justify-center p-6 bg-card text-foreground text-center"
                      onClick={() => handleNonVideoTap(post, idx)}
                    >
                      <p className="text-base sm:text-lg font-semibold">
                        {post.caption?.trim() || "Text post"}
                      </p>
                    </div>
                  )}

                  {showHeart === idx && (
                    <Heart className="absolute w-32 h-32 text-foreground fill-foreground animate-ping" />
                  )}

                  {soundIndicator?.index === idx && (
                    <div className="absolute top-6 right-6 rounded-full bg-black/55 p-3 text-gray-900 dark:text-white backdrop-blur-sm">
                      {soundIndicator.muted ? (
                        <VolumeX className="w-6 h-6" />
                      ) : (
                        <Volume2 className="w-6 h-6" />
                      )}
                    </div>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background/85 via-background/30 to-transparent" />

                {/* RIGHT ACTIONS */}
                <div className="absolute right-3 bottom-28 flex flex-col gap-6 z-20 items-center">
                  <button
                    onClick={() => handleLike(post._id)}
                    className="flex items-center justify-center"
                  >
                    <Heart
                      className={`w-7 h-7 transition ${
                        isLiked
                          ? "text-red-500 fill-red-500"
                          : "text-foreground"
                      }`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openLikes(post._id);
                    }}
                    className="text-foreground text-xs text-center"
                  >
                    {post.likes?.length || 0} like{(post.likes?.length || 0) === 1 ? "" : "s"}
                  </button>

                  <button onClick={() => openComments(post._id)}>
                    <MessageCircle className="text-foreground w-7 h-7" />
                    <p className="text-foreground text-xs text-center mt-1">
                      {post.comments?.length || 0}
                    </p>
                  </button>

                  <button onClick={() => handleShare(post)}>
                    <Share2 className="text-foreground w-7 h-7" />
                  </button>
                </div>

                {/* USER INFO */}
                <div className="absolute bottom-28 left-4 right-16 text-foreground z-20 md:bottom-6">
                  <div
                    className="flex items-center gap-3"
                    onClick={() => navigate(`/user/${post.user_id}`)}
                  >
                 <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full overflow-hidden border-2 border-border flex items-center justify-center bg-card shadow-md mr-1">
  <img
    src={getProfileImage(post.user_id, profiles[post.user_id])}
    alt={`${profiles[post.user_id]?.username || "User"} avatar`}
    onError={() => {
      setAvatarLoadFailedByUser((prev) => {
        if (prev[post.user_id]) return prev;
        return { ...prev, [post.user_id]: true };
      });
    }}
    className="w-full h-full object-cover object-center select-none"
    draggable={false}
    style={{ display: 'block' }}
  />
</div>
                    <div>
                      <span className="font-semibold cursor-pointer">
                        {getHandleText(profiles[post.user_id])}
                      </span>
                      <p className="text-xs text-muted-foreground truncate">{getDisplayName(profiles[post.user_id])}</p>
                    </div>
                    {auth.currentUser?.uid !== post.user_id && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleFollow(post.user_id);
                        }}
                        disabled={Boolean(followLoadingByUser[post.user_id])}
                        className="ml-1 px-3 py-1 rounded-md text-xs font-semibold border border-border bg-card/30 hover:bg-card/50 disabled:opacity-60"
                      >
                        {followLoadingByUser[post.user_id]
                          ? "..."
                          : followStatusByUser[post.user_id] === "following"
                            ? "Following"
                            : followStatusByUser[post.user_id] === "requested"
                              ? "Requested"
                              : "Follow"}
                      </button>
                    )}
                  </div>

                  {post.caption && (
                    <>
                      <p className={`text-sm mt-2 ${expandedCaptions[post._id] ? "" : "line-clamp-2"}`}>
                        {post.caption}
                      </p>
                      {post.caption.length > 120 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCaptions((prev) => ({
                              ...prev,
                              [post._id]: !prev[post._id],
                            }));
                          }}
                          className="text-xs font-medium text-primary mt-1"
                        >
                          {expandedCaptions[post._id] ? "Show less" : "Read more"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center py-4 text-foreground">Loading...</div>
        )}
        {!hasMore && (
          <div className="flex justify-center py-4 text-muted-foreground text-xs">No more posts</div>
        )}
      </div>

      {/* COMMENTS MODAL */}
      {commentsOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card text-foreground rounded-2xl p-5 max-h-[75vh] overflow-y-auto shadow-2xl border border-border relative">
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-lg text-foreground">Comments</h3>
              <button onClick={() => setCommentsOpen(false)} className="text-2xl font-bold text-muted-foreground absolute right-4 top-4">✕</button>
            </div>

            {activeComments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No comments yet
              </p>
            ) : (
              <div className="space-y-4">
                {activeComments.map((c, i) => {
                  const commentProfile = profiles[c.user_id] || {};
                  const handle = getHandleText({
                    username: c.username || commentProfile.username,
                    public_id: c.public_id || commentProfile.public_id,
                  });
                  const displayName =
                    c.full_name ||
                    commentProfile.full_name ||
                    c.username ||
                    c.public_id ||
                    "User";
                  const avatarUrl =
                    c.user_image ||
                    resolveProfileImageUrl(commentProfile.image_name) ||
                    getProfileFallbackIcon(commentProfile);

                  return (
                    <button
                      key={i}
                      className="flex w-full items-start gap-3 text-left"
                      onClick={() => {
                        setCommentsOpen(false);
                        if (c.user_id) navigate(`/user/${c.user_id}`);
                      }}
                    >
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-9 h-9 rounded-full object-cover border border-border"
                      />
                      <div>
                        <p className="font-semibold text-sm">{handle}</p>
                        <p className="text-xs text-muted-foreground truncate">{displayName}</p>
                        <p className="text-sm text-foreground">{c.text}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {likesOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card text-foreground rounded-2xl p-5 max-h-[75vh] overflow-y-auto shadow-2xl border border-border relative">
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-lg text-foreground">Likes</h3>
              <button onClick={() => setLikesOpen(false)} className="text-2xl font-bold text-muted-foreground absolute right-4 top-4">✕</button>
            </div>
            {activeLikeUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No likes yet.</p>
            ) : (
              <div className="space-y-3">
                {activeLikeUsers.map((user) => {
                  const uid = user.firebase_uid || user.user_id;
                  return (
                    <button
                      key={uid}
                      className="flex w-full items-center gap-3 text-left"
                      onClick={() => {
                        setLikesOpen(false);
                        if (uid) navigate(`/user/${uid}`);
                      }}
                    >
                      <img
                        src={resolveProfileImageUrl(user.image_name) || getProfileFallbackIcon(user)}
                        alt={user.username || user.full_name || "User"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{getHandleText({ username: user.username, public_id: user.public_id })}</p>
                        {user.full_name ? (
                          <p className="text-xs text-muted-foreground truncate">{user.full_name}</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default DiscoverView;
