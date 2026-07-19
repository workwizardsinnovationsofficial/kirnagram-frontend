import React, { useRef } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { HeroBanner } from "@/components/feed/HeroBanner";
import { FeedPost } from "@/components/feed/FeedPost";
import { auth } from "@/firebase";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import profileIcon from "@/assets/profileicon.png";
import SuggestedUsers from "@/components/feed/SuggestedUsers";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const FEED_CACHE_KEY = "kirnagram:home-feed-cache";
const FEED_SCROLL_KEY = "kirnagram:home-feed-scroll";
const ADSENSE_CLIENT = "ca-pub-4174888959110856";

type Post = {
  _id: string;
  user_id: string;
  image_url: string;
  prompt_sample_images?: string[];
  video_url?: string;
  ratio?: string;
  caption?: string;
  likes?: string[];
  comments?: any[];
  tags?: string[];
  is_prompt_post?: boolean;
  prompt_badge?: string;
  prompt_id?: string;
  created_at?: string;
  views?: string[];
  type?: string;
};

type UserSummary = {
  firebase_uid: string;
  username?: string;
  full_name?: string;
  public_id?: string;
  image_name?: string;
  gender?: string;
  is_creator?: boolean;
  follow_status?: "none" | "requested" | "following";
};

type Comment = {
  comment_id: string;
  user_id: string;
  username?: string;
  user_image?: string;
  text: string;
  created_at?: string;
};

const getCommentAuthorName = (comment: Comment, userProfiles: Record<string, UserSummary>) => {
  const profile = userProfiles[comment.user_id];
  return profile?.full_name || profile?.username || profile?.public_id || comment.username || "User";
};

const getUserHandle = (user?: { username?: string; public_id?: string; }, commentUsername?: string) => {
  if (user?.username) {
    return user.username.startsWith("@") ? user.username : `@${user.username}`;
  }
  if (user?.public_id) {
    return user.public_id.startsWith("@") ? user.public_id : `@${user.public_id}`;
  }
  if (commentUsername) {
    return commentUsername.startsWith("@") ? commentUsername : `@${commentUsername}`;
  }
  return "@user";
};

const getCommentAuthorHandle = (comment: Comment, userProfiles: Record<string, UserSummary>) => {
  const profile = userProfiles[comment.user_id];
  return getUserHandle(profile, comment.username);
};


type RemixReturnState = {
  fromRemix?: boolean;
  focusPostId?: string;
  restoreScrollY?: number;
};

function FeedKirnagramAd({ placement = "home_banner" }: { placement?: string }) {
  const [ad, setAd] = useState<any | null>(null);
  const [loadingAd, setLoadingAd] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/ads/public/placement-ads?placement=${placement}&limit=5`);
        if (!res.ok) {
          setAd(null);
          return;
        }
        const data = await res.json();
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.ads)
          ? data.ads
          : Array.isArray(data)
          ? data
          : [];
        if (mounted) setAd(items.length ? items[Math.floor(Math.random() * items.length)] : null);
      } catch (e) {
        if (mounted) setAd(null);
      } finally {
        if (mounted) setLoadingAd(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [placement]);

  if (loadingAd) return null;
  if (!ad) return (
    <div className="w-full max-w-[600px] rounded-2xl overflow-hidden shadow-lg border bg-card border-border p-6">
      <div className="text-sm text-muted-foreground">No ads available right now.</div>
    </div>
  );

  return (
    <div className="w-full max-w-[600px] rounded-2xl overflow-hidden shadow-lg border bg-card border-border">
      <div className="p-3 border-b border-border/70 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.16em] text-primary font-semibold">Sponsored</p>
        <span className="text-xs text-muted-foreground">Kirnagram Ad</span>
      </div>

      <div className="bg-white flex items-center justify-center" style={{ aspectRatio: "4 / 5" }}>
        {ad.video_preview_url ? (
          <video src={ad.video_preview_url} className="w-full h-full object-cover" autoPlay muted playsInline />
        ) : (
          <img src={ad.photo_preview_url} alt={ad.ad_name || "Ad"} className="w-full h-full object-cover" />
        )}
      </div>
    </div>
  );
}

const POSTS_PER_PAGE = 5; // Load 5 posts at a time for smooth scrolling

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPostsCache, setAllPostsCache] = useState<Post[]>([]); // Store all fetched posts
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  const [userProfiles, setUserProfiles] = useState<Record<string, UserSummary>>({});
  const [followStatusByUser, setFollowStatusByUser] = useState<Record<string, "none" | "requested" | "following">>({});
  const [followBusyByUser, setFollowBusyByUser] = useState<Record<string, boolean>>({});
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [showLikes, setShowLikes] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [likeUsers, setLikeUsers] = useState<any[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const viewTimers = useRef<Record<string, number>>({});
  const viewedPostIds = useRef<Set<string>>(new Set());
  const remixRestoreAppliedRef = useRef(false);
  const feedAdSlot = (import.meta.env.VITE_HOME_FEED_AD_SLOT || "").trim();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const restoreCachedFeed = useCallback(() => {
    const cached = sessionStorage.getItem(FEED_CACHE_KEY);
    if (!cached) return false;

    try {
      const parsed = JSON.parse(cached) as { posts?: Post[] };
      if (!Array.isArray(parsed.posts) || parsed.posts.length === 0) return false;
      setPosts(parsed.posts);
      setLoading(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const shufflePosts = useCallback((items: Post[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, []);

  const fetchFeed = useCallback(async (mixOrder = false, isInitialLoad = true) => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const token = await user.getIdToken();
      // 🎯 FETCH: Get first page (page=1) with 5 posts
      const res = await fetch(`${API_BASE}/posts/feed?page=1&limit=${POSTS_PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      
      // 🎯 HANDLE: Backend returns {posts, pagination} structure
      const allPosts = data.posts && Array.isArray(data.posts) ? data.posts : [];
      const paginationData = data.pagination || {};
      const shuffled = mixOrder ? shufflePosts(allPosts) : allPosts;

      const profilesFromPosts: Record<string, UserSummary> = {};
      shuffled.forEach((post) => {
        if (post.user_profile && post.user_profile.firebase_uid) {
          profilesFromPosts[post.user_profile.firebase_uid] = {
            firebase_uid: post.user_profile.firebase_uid,
            username: post.user_profile.username,
            full_name: post.user_profile.full_name,
            public_id: post.user_profile.public_id,
            image_name: post.user_profile.image_name,
            gender: post.user_profile.gender,
            is_creator: post.user_profile.is_creator,
            follow_status: post.user_profile.follow_status,
          };
        }
      });

      // 🎯 CACHE: Store both posts and pagination metadata
      setAllPostsCache(shuffled);
      setUserProfiles((prev) => ({ ...profilesFromPosts, ...prev }));

      if (isInitialLoad) {
        // On initial load, display first page posts
        setPosts(shuffled);
        setCurrentPage(1);
        // Use backend's hasMore flag
        setHasMore(paginationData.hasMore || false);
        console.log(`✅ [fetchFeed] Initial load complete. Total posts: ${paginationData.total}, HasMore: ${paginationData.hasMore}`);
      }
    } catch (error) {
      console.error("❌ [fetchFeed] Error:", error);
      if (isInitialLoad) {
        setPosts([]);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [shufflePosts]);

  const isValidRemoteImage = (url?: string) =>
    typeof url === "string" &&
    url.trim() !== "" &&
    url.startsWith("http") &&
    !url.includes("default") &&
    !url.includes("placeholder") &&
    !url.startsWith("blob:");

  const getProfileImage = (profile?: UserSummary) => {
    if (profile?.image_name && isValidRemoteImage(profile.image_name)) return profile.image_name;
    if (profile?.gender === "male") return maleIcon;
    if (profile?.gender === "female") return femaleIcon;
    return profileIcon;
  };

  const getUserAvatar = (user?: {
    image_name?: string;
    image?: string;
    user_image?: string;
    gender?: string;
  }) => {
    const direct = user?.image_name || user?.image || user?.user_image;
    if (direct && isValidRemoteImage(direct)) return direct;
    if (user?.gender === "male") return maleIcon;
    if (user?.gender === "female") return femaleIcon;
    return profileIcon;
  };

  useEffect(() => {
    const restored = restoreCachedFeed();
    if (!restored) {
      fetchFeed(false, true);
    }
  }, [fetchFeed, restoreCachedFeed]);

  useEffect(() => {
    if (loading) return;
    const savedScroll = sessionStorage.getItem(FEED_SCROLL_KEY);
    if (!savedScroll) return;

    const scrollY = Number(savedScroll);
    if (Number.isNaN(scrollY)) {
      sessionStorage.removeItem(FEED_SCROLL_KEY);
      return;
    }

    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "auto" });
      sessionStorage.removeItem(FEED_SCROLL_KEY);
    });
  }, [loading, posts.length]);

  useEffect(() => {
    const handleHomeRefresh = () => {
      setLoading(true);
      setLoadingMore(false);
      setCurrentPage(0);
      setHasMore(true);
      setAllPostsCache([]);
      viewedPostIds.current.clear();
      sessionStorage.removeItem(FEED_CACHE_KEY);
      sessionStorage.removeItem(FEED_SCROLL_KEY);
      fetchFeed(true, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("kirnagram:home-refresh", handleHomeRefresh);
    return () => window.removeEventListener("kirnagram:home-refresh", handleHomeRefresh);
  }, [fetchFeed]);

  useEffect(() => {
    const loadProfiles = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const viewerUid = user.uid;
      const token = await user.getIdToken();

      const uniqueIds = Array.from(new Set(posts.map((post) => post.user_id)));
      const missingIds = uniqueIds.filter((id) => !userProfiles[id]);
      if (missingIds.length === 0) return;

      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const res = await fetch(`${API_BASE}/follow/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to load user profile");
            const data = await res.json();
            const profile: UserSummary = {
              firebase_uid: data?.firebase_uid || id,
              username: data?.username,
              full_name: data?.full_name,
              public_id: data?.public_id,
              image_name: data?.image_name,
              gender: data?.gender,
              is_creator: data?.is_creator,
              follow_status: data?.follow_status,
            };
            setUserProfiles((prev) => ({ ...prev, [id]: profile }));
            setFollowStatusByUser((prev) => ({
              ...prev,
              [id]: id === viewerUid ? "none" : (data?.follow_status || "none"),
            }));
          } catch {
            setUserProfiles((prev) => ({
              ...prev,
              [id]: { firebase_uid: id, username: "User", public_id: id },
            }));
            setFollowStatusByUser((prev) => ({
              ...prev,
              [id]: id === viewerUid ? "none" : "none",
            }));
          }
        })
      );
    };

    loadProfiles();
  }, [posts, userProfiles]);

  const orderedPosts = useMemo(() => posts, [posts]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const user = auth.currentUser;
    
    try {
      const nextPage = currentPage + 1;
      const token = await user?.getIdToken();
      
      if (!token) throw new Error("User not authenticated");

      console.log(`📜 [loadMorePosts] Fetching page ${nextPage} with ${POSTS_PER_PAGE} posts per page...`);

      // 🎯 FETCH: Get next page from backend
      const res = await fetch(
        `${API_BASE}/posts/feed?page=${nextPage}&limit=${POSTS_PER_PAGE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to load more posts");
      
      const data = await res.json();
      const newPosts = data.posts && Array.isArray(data.posts) ? data.posts : [];
      const paginationData = data.pagination || {};

      const profilesFromPosts: Record<string, UserSummary> = {};
      newPosts.forEach((post) => {
        if (post.user_profile && post.user_profile.firebase_uid) {
          profilesFromPosts[post.user_profile.firebase_uid] = {
            firebase_uid: post.user_profile.firebase_uid,
            username: post.user_profile.username,
            full_name: post.user_profile.full_name,
            public_id: post.user_profile.public_id,
            image_name: post.user_profile.image_name,
            gender: post.user_profile.gender,
            is_creator: post.user_profile.is_creator,
            follow_status: post.user_profile.follow_status,
          };
        }
      });

      if (Object.keys(profilesFromPosts).length > 0) {
        setUserProfiles((prev) => ({ ...profilesFromPosts, ...prev }));
      }

      if (newPosts.length > 0) {
        // 🎯 APPEND: Add new posts to existing list
        setPosts((prevPosts) => [...prevPosts, ...newPosts]);
        setCurrentPage(nextPage);
        setHasMore(paginationData.hasMore || false);
        console.log(`✅ [loadMorePosts] Loaded page ${nextPage}. HasMore: ${paginationData.hasMore}`);
      } else {
        // No more posts available
        setHasMore(false);
        console.log(`ℹ️ [loadMorePosts] No more posts to load`);
      }
    } catch (error) {
      console.error("❌ [loadMorePosts] Error:", error);
      toast({
        title: "Failed to load more posts",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, loadingMore, hasMore]);

  const updatePost = (postId: string, updater: (post: Post) => Post) => {
    setPosts((prev) => prev.map((post) => (post._id === postId ? updater(post) : post)));
  };

  const handleLike = async (postId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/posts/like/${postId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to like post");
      const data = await res.json();
      updatePost(postId, (post) => {
        const likes = new Set(post.likes || []);
        if (data.liked) {
          likes.add(currentUser.uid);
        } else {
          likes.delete(currentUser.uid);
        }
        return { ...post, likes: Array.from(likes) };
      });
    } catch (error) {
      toast({
        title: "Like failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (post: Post) => {
    const shareUrl = `${window.location.origin}/posts/view/${post.user_id}?postId=${post._id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.caption || "kirnagram Post",
          text: post.caption || "",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied", description: shareUrl });
      }
    } catch {
      toast({ title: "Share failed", variant: "destructive" });
    }
  };

  const openProfile = (id?: string) => {
    if (!id) return;
    sessionStorage.setItem(FEED_SCROLL_KEY, String(window.scrollY));
    sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ posts }));
    navigate(auth.currentUser?.uid === id ? "/profile" : `/user/${id}`);
  };

  const handleToggleFollow = async (targetUid: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    if (!targetUid) {
      toast({ title: "Follow failed", description: "Invalid user identifier", variant: "destructive" });
      return;
    }
    if (currentUser.uid === targetUid) return;

    const currentStatus = followStatusByUser[targetUid] || "none";
    setFollowBusyByUser((prev) => ({ ...prev, [targetUid]: true }));

    try {
      const token = await currentUser.getIdToken();

      if (currentStatus === "following" || currentStatus === "requested") {
        const res = await fetch(`${API_BASE}/follow/unfollow/${targetUid}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to unfollow");
        setFollowStatusByUser((prev) => ({ ...prev, [targetUid]: "none" }));
      } else {
        const res = await fetch(`${API_BASE}/follow/send-request/${targetUid}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to follow");
        const data = await res.json();
        const nextStatus = data?.follow_status === "following" ? "following" : "requested";
        setFollowStatusByUser((prev) => ({ ...prev, [targetUid]: nextStatus }));
      }
    } catch (error) {
      toast({
        title: "Follow failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setFollowBusyByUser((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  const openLikes = async (postId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setActivePostId(postId);
    setShowLikes(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/posts/likes/${postId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to load likes");
      const data = await res.json();
      setLikeUsers(data.likes || []);
    } catch {
      setLikeUsers([]);
    }
  };

  const openComments = async (postId: string) => {
    setActivePostId(postId);
    setShowComments(true);
    try {
      const res = await fetch(`${API_BASE}/posts/comments/${postId}`);
      if (!res.ok) throw new Error("Failed to load comments");
      const data = await res.json();
      const commentList: Comment[] = Array.isArray(data.comments) ? data.comments : [];
      setComments(commentList);

      // Ensure profile map has commenters for avatar/handle fallback
      const commenterIds = Array.from(new Set(commentList.map((c) => c.user_id)));
      const missingIds = commenterIds.filter((id) => id && !userProfiles[id]);
      if (missingIds.length > 0) {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          await Promise.all(
            missingIds.map(async (id) => {
              try {
                const uRes = await fetch(`${API_BASE}/follow/${id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!uRes.ok) return;
                const uData = await uRes.json();
                setUserProfiles((prev) => ({ ...prev, [id]: { ...prev[id], ...uData } }));
              } catch {
                // no-op
              }
            })
          );
        }
      }
    } catch {
      setComments([]);
    }
  };

  const handleAddView = async (postId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser || viewedPostIds.current.has(postId)) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/posts/view/${postId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to add view");
      viewedPostIds.current.add(postId);
      updatePost(postId, (post) => {
        const views = new Set(post.views || []);
        views.add(currentUser.uid);
        return { ...post, views: Array.from(views) };
      });
    } catch {
      // ignore view errors
    }
  };

  const handleAddComment = async () => {
    if (!activePostId || !commentInput.trim()) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      setIsSubmitting(true);
      const token = await currentUser.getIdToken();
      const formData = new FormData();
      formData.append("text", commentInput.trim());
      const res = await fetch(`${API_BASE}/posts/comment/${activePostId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      if (!res.ok) throw new Error("Failed to add comment");
      const newComment: Comment = {
        comment_id: `${Date.now()}`,
        user_id: currentUser.uid,
        username: currentUser.displayName || "You",
        user_image: currentUser.photoURL || undefined,
        text: commentInput.trim(),
      };
      setComments((prev) => [newComment, ...prev]);
      updatePost(activePostId, (post) => ({
        ...post,
        comments: [newComment, ...(post.comments || [])],
      }));
      setCommentInput("");
    } catch (error) {
      toast({
        title: "Comment failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (posts.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.getAttribute("data-post-id");
          if (!postId) return;
          if (entry.isIntersecting) {
            if (viewTimers.current[postId]) return;
            viewTimers.current[postId] = window.setTimeout(() => {
              delete viewTimers.current[postId];
              handleAddView(postId);
            }, 2000);
          } else if (viewTimers.current[postId]) {
            clearTimeout(viewTimers.current[postId]);
            delete viewTimers.current[postId];
          }
        });
      },
      { threshold: 0.6 }
    );

    posts.forEach((post) => {
      const node = postRefs.current[post._id];
      if (node) observer.observe(node);
    });

    return () => {
      observer.disconnect();
      Object.values(viewTimers.current).forEach((timerId) => clearTimeout(timerId));
      viewTimers.current = {};
    };
  }, [posts]);

  // 🎯 INFINITE SCROLL: Detect when user scrolls near the bottom
  useEffect(() => {
    if (posts.length === 0 || loadingMore || !hasMore) return;

    const sentinelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loadingMore) {
            console.log("📜 [Infinite Scroll] User scrolled near bottom, loading more posts...");
            loadMorePosts();
          }
        });
      },
      { threshold: 0.1, rootMargin: "100px" } // Trigger 100px before reaching the sentinel
    );

    if (sentinelRef.current) {
      sentinelObserver.observe(sentinelRef.current);
    }

    return () => sentinelObserver.disconnect();
  }, [hasMore, loadingMore, loadMorePosts, posts.length]);

  useEffect(() => {
    const state = (location.state || null) as RemixReturnState | null;
    if (!state?.fromRemix) {
      remixRestoreAppliedRef.current = false;
      return;
    }

    if (remixRestoreAppliedRef.current || loading || orderedPosts.length === 0) return;

    remixRestoreAppliedRef.current = true;

    requestAnimationFrame(() => {
      if (typeof state.restoreScrollY === "number") {
        window.scrollTo({ top: state.restoreScrollY, behavior: "auto" });
      } else if (state.focusPostId && postRefs.current[state.focusPostId]) {
        postRefs.current[state.focusPostId]?.scrollIntoView({ block: "center", behavior: "auto" });
      }

      // Clear temporary restoration state so normal navigation remains unchanged.
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    });
  }, [location.pathname, location.search, location.state, loading, navigate, orderedPosts.length]);


  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 overflow-x-hidden overflow-y-hidden scrollbar-hide">
       

        {/* Hero Banner */}
        <HeroBanner />

        {/* Stories removed from home feed (user requested) */}

        {/* Feed Posts */}
        {loading ? (
          <div className="py-10 text-center text-muted-foreground">Loading feed...</div>
        ) : orderedPosts.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No posts yet.</div>
        ) : (
          <div className="space-y-6">
            {orderedPosts.map((post, index) => {
              const author = userProfiles[post.user_id];
              const isOwnPost = auth.currentUser?.uid === post.user_id;
              const showRemix = Boolean(post.is_prompt_post);
              const isLiked = auth.currentUser?.uid
                ? post.likes?.includes(auth.currentUser.uid)
                : false;

              // For video posts, auto-play the first video and respect global mute
              const isVideo = post.type === "video" || (post.video_url && !post.image_url);

              return (
                <React.Fragment key={post._id}>
                  <div
                    data-post-id={post._id}
                    ref={(node) => {
                      postRefs.current[post._id] = node;
                    }}
                  >
                    <FeedPost
                      author={{
                        name: author?.full_name || author?.username || author?.public_id || "User",
                        username: author?.username || author?.public_id || "user",
                        public_id: author?.public_id,
                        avatar: getProfileImage(author),
                        isVerified: author?.is_creator,
                      }}
                      image={post.image_url || post.video_url || undefined}
                      sampleImages={showRemix ? post.prompt_sample_images || [] : []}
                      mediaType={
                        post.type === "video" || isVideo
                          ? "video"
                          : post.type === "text" || (!post.image_url && !post.video_url)
                          ? "text"
                          : "image"
                      }
                      ratio={post.ratio}
                      caption={post.caption}
                      tags={showRemix ? post.tags || [] : []}
                      badge={showRemix ? post.prompt_badge || "Creator" : undefined}
                      likes={post.likes?.length ?? 0}
                      comments={post.comments?.length ?? 0}
                      views={post.views?.length ?? 0}
                      isLiked={Boolean(isLiked)}
                      showRemix={showRemix}
                      onLike={() => handleLike(post._id)}
                      onOpenLikes={() => openLikes(post._id)}
                      onOpenComments={() => openComments(post._id)}
                      onShare={() => handleShare(post)}
                      onAddToStory={() =>
                        navigate("/story/upload", {
                          state: {
                            imageUrl: post.image_url,
                            videoUrl: post.video_url,
                            posterUrl: post.image_url,
                          },
                        })
                      }
                      onRemix={() => {
                        const remixNavState = {
                          returnTo: `${location.pathname}${location.search}`,
                          fromPostId: post._id,
                          returnScrollY: window.scrollY,
                        };

                        if (post.prompt_id) {
                          navigate(`/remix/${post.prompt_id}`, { state: remixNavState });
                        } else {
                          navigate(`/remix/${post._id}`, { state: remixNavState });
                        }
                      }}
                      onAuthorClick={() => openProfile(post.user_id)}
                      showFollowButton={!isOwnPost}
                      followState={followStatusByUser[post.user_id] || "none"}
                      followLoading={Boolean(followBusyByUser[post.user_id])}
                      onToggleFollow={() => handleToggleFollow(post.user_id)}
                      // Pass global mute state to FeedPost (if it supports it)
                    />
                  </div>

                  {(index + 1) % 10 === 0 && (
                    <div className="w-full flex justify-center">
                      <FeedKirnagramAd placement={"home_banner"} />
                    </div>
                  )}

                  {index === 1 && (
                    <div key="suggested-users">
                      <SuggestedUsers onOpenProfile={openProfile} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* 🎯 INFINITE SCROLL: Sentinel element to detect when user scrolls to bottom */}
            <div
              ref={sentinelRef}
              className="py-8 text-center"
              data-testid="infinite-scroll-sentinel"
            >
              {loadingMore && (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-primary rounded-full"></div>
                  <p className="text-sm text-muted-foreground">Loading more posts...</p>
                </div>
              )}
              {!hasMore && orderedPosts.length > 0 && (
                <p className="text-sm text-muted-foreground">No more posts to load</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showLikes} onOpenChange={setShowLikes}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Likes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {likeUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No likes yet.</p>
            ) : (
              likeUsers.map((user) => {
                const userId = user.firebase_uid || user.user_id;
                return (
                  <button
                    key={userId}
                    className="flex w-full items-center gap-3 text-left"
                    onClick={() => openProfile(userId)}
                  >
                    <img
                      src={getUserAvatar(user)}
                      alt={user.username || user.full_name || "User"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{getUserHandle(user)}</p>
                      {user.full_name && user.full_name !== user.username ? (
                        <p className="text-xs text-muted-foreground truncate">{user.full_name}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              comments.map((comment) => (
                <button
                  key={comment.comment_id}
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() => openProfile(comment.user_id)}
                >
                  <img
                    src={
                      comment.user_image ||
                      getUserAvatar(userProfiles[comment.user_id]) ||
                      getUserAvatar({ user_image: comment.user_image })
                    }
                    alt={getCommentAuthorName(comment, userProfiles)}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{getCommentAuthorHandle(comment, userProfiles)}</p>
                    {userProfiles[comment.user_id]?.full_name ? (
                      <p className="text-xs text-muted-foreground truncate">{userProfiles[comment.user_id]?.full_name}</p>
                    ) : null}
                    <p className="text-sm text-muted-foreground break-words">{comment.text}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Input
              placeholder="Add a comment..."
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
            />
            <Button onClick={handleAddComment} disabled={isSubmitting} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
};

export default Index;
