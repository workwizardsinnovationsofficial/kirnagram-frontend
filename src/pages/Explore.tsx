import { useState, useEffect, useMemo, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  Search, 
  ChevronLeft,
  ChevronRight,
  Heart,
  Eye,
  Crown,
  MessageCircle,
  UserPlus,
  UserCheck,
  Clock,
  Bookmark,
  Repeat
} from "lucide-react";
import { StoriesRow } from "@/components/feed/StoriesRow";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { auth } from "@/firebase";
import { TopCreatorsSkeleton, PostGridSkeleton, SpotlightSkeleton, TrendingPostSkeleton } from "@/components/Skeleton";
import cyberGirl from "@/assets/hero-banner2.png";
import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import heroBanner from "@/assets/hero-banner.jpg";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";

const spotlightArt = {
  image: cyberGirl,
  title: "Ethereal Dreams",
  creator: "NeonMaster",
  creatorAvatar: avatar1,
  views: "24.5K",
  likes: "8.2K",
  style: "Cyberpunk Noir",
};

// Remove static featuredStyles and discoveryGrid, will use real posts

// Remove static topCreators, will use real AI creator accounts

// Type definitions moved here
type Post = {
  _id: string;
  user_id: string;
  image_url?: string;
  video_url?: string;
  type?: "image" | "video" | "text";
  ratio?: string;
  caption?: string;
  tags?: string[];
  is_prompt_post?: boolean;
  prompt_badge?: string;
  prompt_id?: string;
  remix_count?: number;
  likes?: string[];
  comments?: any[];
  views?: string[];
  created_at?: string;
};

type DiscoverPlacementAd = {
  _id: string;
  publisher_id: string;
  ad_name: string;
  business_name?: string;
  description?: string;
  photo_preview_url?: string;
  video_preview_url?: string;
  metrics?: {
    views?: number;
    detail_clicks?: number;
  };
};


type UserSummary = {
  firebase_uid: string;
  username?: string;
  full_name?: string;
  image_name?: string;
  gender?: string;
  is_creator?: boolean;
  total_remix_count?: number;
  has_active_story?: boolean;
  first_story_id?: string | null;
  public_id?: string;
  avatar?: string;
  follow_status?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.kirnagram.com";


const Explore = () => {
    // --- Follow/Unfollow logic for search user cards ---
    const handleFollowClick = async (user: any, idx: number) => {
      if (!currentUser) return;
      setActionLoading(user.firebase_uid);
      try {
        const token = await currentUser.getIdToken();
        // If already following, do nothing (or could implement unfollow)
        if (user.follow_status === 'following') return;
        // Send follow request
        const targetId = user.firebase_uid || user._id || user.public_id || user.username;
        if (!targetId) return;
        const res = await fetch(`${API_BASE}/follow/send-request/${targetId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          // Get new status from response
          const data = await res.json();
          // Update follow_status in searchResults
          setSearchResults((prev: any[]) => prev.map((u, i) =>
            i === idx ? { ...u, follow_status: data.status === 'success' && data.message?.toLowerCase().includes('requested') ? 'requested' : 'following' } : u
          ));
        }
      } catch (e) {
        // Optionally show error
      } finally {
        setActionLoading(null);
      }
    };
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [promptResults, setPromptResults] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserSummary>>({});
  const [topCreators, setTopCreators] = useState<UserSummary[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [spotlightAds, setSpotlightAds] = useState<DiscoverPlacementAd[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(true);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const trendingRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const dragTimeout = useRef<number | null>(null);
  const [showNav, setShowNav] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const appliedTagRef = useRef<string>("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadExplorePosts = async (pageNumber = 1) => {
    if (!currentUser) return;
    if (pageNumber === 1) {
      setPostsLoaded(false);
      setHasMore(true);
    }

    if (pageNumber > 1) {
      setLoadingMore(true);
    }

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/posts/explore?page=${pageNumber}&limit=12`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load posts");
      const data = await res.json();
      const fetchedPosts = Array.isArray(data.posts) ? data.posts : [];
      setPosts((prev) => (pageNumber === 1 ? fetchedPosts : [...prev, ...fetchedPosts]));
      setPage(pageNumber);
      setHasMore(Boolean(data.pagination?.hasMore));
    } catch (error) {
      console.error("Failed to load explore posts:", error);
      if (pageNumber === 1) {
        setPosts([]);
      }
      setHasMore(false);
    } finally {
      if (pageNumber === 1) {
        setPostsLoaded(true);
      }
      if (pageNumber > 1) {
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadExplorePosts(1);
  }, [currentUser]);

  useEffect(() => {
    if (searchQuery.trim() || !postsLoaded || loadingMore || !hasMore) return;

    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 320) {
        if (!loadingMore && hasMore) {
          loadExplorePosts(page + 1);
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [page, hasMore, loadingMore, postsLoaded, searchQuery, currentUser]);

  // Fetch user profiles for posts
  useEffect(() => {
    const loadProfiles = async () => {
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      const uniqueIds = Array.from(new Set(posts.map((post) => post.user_id)));
      const missingIds = uniqueIds.filter((id) => !userProfiles[id]);
      if (missingIds.length === 0) return;
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const res = await fetch(`${API_BASE}/profile/user/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 403) {
              setUserProfiles((prev) => ({
                ...prev,
                [id]: { firebase_uid: id, username: "Private User" },
              }));
              return;
            }
            if (!res.ok) throw new Error("Failed to load user profile");
            const data = await res.json();
            setUserProfiles((prev) => ({ ...prev, [id]: data }));
          } catch {
            setUserProfiles((prev) => ({
              ...prev,
              [id]: { firebase_uid: id, username: "User" },
            }));
          }
        })
      );
    };
    loadProfiles();
  }, [posts, currentUser, userProfiles]);

  // Fetch AI creators leaderboard data (authoritative remix totals)
  useEffect(() => {
    const fetchTopCreators = async (showFallback = false) => {
      if (!currentUser) return;
      setCreatorsLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/profile/creators/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load creators");
        const data = await res.json();
        const creators = Array.isArray(data) ? data : [];
        const sorted = creators
          .filter((u: UserSummary) => u.is_creator)
          .sort((a: UserSummary, b: UserSummary) => (b.total_remix_count || 0) - (a.total_remix_count || 0));
        setTopCreators(sorted);
      } catch {
        if (showFallback) setTopCreators([]);
      } finally {
        setCreatorsLoading(false);
      }
    };

    fetchTopCreators(true);
    const intervalId = window.setInterval(() => fetchTopCreators(false), 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [currentUser]);

  useEffect(() => {
    const loadDiscoverSpotlightAds = async () => {
      setSpotlightLoading(true);
      try {
        const res = await fetch(`${API_BASE}/ads/public/placement-ads?placement=discover_banner&limit=20`);
        if (!res.ok) {
          setSpotlightAds([]);
          return;
        }
        const data = await res.json();
        const items: DiscoverPlacementAd[] = Array.isArray(data?.items) ? data.items : [];
        setSpotlightAds(items);
        if (items.length > 1) {
          setSpotlightIndex(Math.floor(Math.random() * items.length));
        }
      } catch {
        setSpotlightAds([]);
      } finally {
        setSpotlightLoading(false);
      }
    };

    loadDiscoverSpotlightAds();
  }, []);

  // Horizontal wheel -> scroll horizontally when over the trending row
  useEffect(() => {
    const el = trendingRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0 && Math.abs(e.deltaX) <= Math.abs(e.deltaY)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Drag handlers to hide nav while dragging
  useEffect(() => {
    const el = trendingRef.current;
    if (!el) return;

    let startX = 0;
    let scrollLeft = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      setShowNav(false);
      startX = e.clientX;
      scrollLeft = el.scrollLeft;
      (e.target as HTMLElement).setPointerCapture?.((e as any).pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = startX - e.clientX;
      el.scrollLeft = scrollLeft + dx;
    };

    const onPointerUp = () => {
      isDragging.current = false;
      if (dragTimeout.current) window.clearTimeout(dragTimeout.current);
      dragTimeout.current = window.setTimeout(() => setShowNav(true), 500);
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  useEffect(() => {
    if (spotlightAds.length <= 1) return;

    const timerId = window.setTimeout(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightAds.length);
    }, 6000);

    return () => window.clearTimeout(timerId);
  }, [spotlightAds.length, spotlightIndex]);

  const activeSpotlightAd = spotlightAds.length > 0 ? spotlightAds[spotlightIndex % spotlightAds.length] : null;

  useEffect(() => {
    if (!activeSpotlightAd?._id) return;
    fetch(`${API_BASE}/ads/campaigns/${activeSpotlightAd._id}/track-view`, { method: "POST" }).catch(() => undefined);
  }, [activeSpotlightAd?._id]);

  // Filtering
  const remixPosts = useMemo(() => posts.filter((p) => p.is_prompt_post), [posts]);
  const trendingRemixPosts = useMemo(() => {
    return [...remixPosts]
      .sort((a, b) => {
        const countA = Number(a.remix_count ?? 0);
        const countB = Number(b.remix_count ?? 0);
        if (countB !== countA) return countB - countA;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      })
      .slice(0, 5);
  }, [remixPosts]);
  const displayedTrendingPosts = showAllTrending ? remixPosts : trendingRemixPosts;
  const normalPosts = useMemo(() => posts.filter((p) => !p.is_prompt_post), [posts]);

  // Grid size logic for normal posts (3x3)
  const gridPosts = useMemo(() => normalPosts.slice(0, 9), [normalPosts]);

  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((post) => {
      (post.tags || []).forEach((rawTag) => {
        const tag = String(rawTag || "").trim().replace(/^#+/, "").toLowerCase();
        if (!tag) return;
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([tag]) => tag);
  }, [posts]);

  // Auto-play DiscoverView after 5 seconds when a grid post is clicked
 

  // Navigation for remix posts
  const handleRemixClick = (post: Post) => {
  console.log("Clicked Remix Post:", post);
  console.log("Prompt ID:", post.prompt_id);

  if (post.prompt_id) {
    navigate(`/remix/${post.prompt_id}`);
  } else {
    console.log("❌ No prompt_id found");
  }
};

  // Search logic (unchanged)
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPromptResults([]);
    if (!query.trim() || !currentUser) {
      setSearchResults([]);
      setPromptResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const token = await currentUser.getIdToken();
      // Username search
      const response = await fetch(`${API_BASE}/follow/search/${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const users = Array.isArray(data.users) ? data.users : [];
        setSearchResults(users);
      }
      // Prompt ID search (local, from posts)
      const lowerQuery = query.trim().toLowerCase();
      const normalizedTagQuery = lowerQuery.replace(/^#+/, "");

      // Debug: log all remix posts and their prompt_badge and prompt_id
      const remixDebug = posts.filter((p) => p.is_prompt_post).map((p) => ({
        _id: p._id,
        prompt_badge: p.prompt_badge,
        prompt_id: p.prompt_id,
        image_url: p.image_url,
      }));
      console.log('All remix posts:', remixDebug);
      console.log('Searching for prompt badge or prompt_id:', lowerQuery);

      // Match if badge or prompt_id equals or contains the query (case-insensitive, trimmed)
      const promptMatches = posts.filter((p) => {
        if (!p.is_prompt_post) return false;
        const badge = String(p.prompt_badge || "").trim().toLowerCase();
        const pid = String(p.prompt_id || "").trim().toLowerCase();
        const hasMatchingTag = (p.tags || []).some((tag) => {
          const normalizedTag = String(tag || "")
            .trim()
            .toLowerCase()
            .replace(/^#+/, "");

          return (
            normalizedTag === normalizedTagQuery ||
            normalizedTag.includes(normalizedTagQuery)
          );
        });
        return (
          badge === lowerQuery ||
          badge.includes(lowerQuery) ||
          pid === lowerQuery ||
          pid.includes(lowerQuery) ||
          hasMatchingTag
        );
      });

      console.log('Prompt matches:', promptMatches);
      setPromptResults(promptMatches);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tagFromUrl = params.get("tag")?.trim().replace(/^#+/, "") || "";

    if (!tagFromUrl) {
      appliedTagRef.current = "";
      return;
    }

    if (!currentUser || !postsLoaded) return;

    const normalizedTag = tagFromUrl.toLowerCase();
    if (appliedTagRef.current === normalizedTag) return;

    appliedTagRef.current = normalizedTag;
    handleSearch(`#${tagFromUrl}`);
  }, [location.search, currentUser, postsLoaded]);

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '') + 'K';
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
      if (img.startsWith("http")) {
        return img;
      }
      return `${API_BASE}/profile/avatar/${img}`;
    }

    return getFallbackProfileImage(user);
  };

  const getDisplayName = (user: UserSummary | any) => {
    return user?.full_name || user?.username || user?.public_id || "Creator";
  };

  const resolveTargetId = (user: any) => {
    return user?.firebase_uid || user?.public_id || user?.username;
  };

  const handleUserRedirect = (userId?: string) => {
    if (!userId) return;
    navigate(`/user/${userId}`);
  };

  return (
    <MainLayout showRightSidebar={true}>
      <div className="w-full min-h-screen pb-24 md:pb-8 bg-background overflow-x-hidden">
        <div className="max-w-2xl md:max-w-6xl mx-auto">
        
        {/* Header with Search & Shuffle */}
        <div className="sticky md:relative top-0 md:top-auto z-50 md:z-10 bg-background/95 backdrop-blur-sm py-3 sm:py-4 px-3 sm:px-4 md:px-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 sm:pl-12 pr-4 sm:pr-5 py-2.5 sm:py-3 bg-card border border-border rounded-2xl text-sm sm:text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
          {topTags.length > 0 && !searchQuery.trim() && (
            <div className="mt-3 sm:mt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Popular hashtags</p>
                <span className="text-xs text-muted-foreground">{topTags.length} tags</span>
              </div>
              <div className="mt-2 sm:mt-3 w-full flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap pb-1 sm:pb-2 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {topTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSearch(`#${tag}`)}
                    className="flex-shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/70 hover:bg-primary/5"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
</div>

        {/* Search Results Section */}
     {searchQuery.trim() && (
  <div className="px-4 md:px-6 pb-6">

    {/* Searching State */}
    {isSearching && (
      <div className="text-center text-muted-foreground py-6">
        Searching...
      </div>
    )}

    {!isSearching && (
      <>
        {/* ================= USER RESULTS ================= */}
        {searchResults.length > 0 && (
          <div className="space-y-4 mb-8">
            {searchResults.map((user: any, idx: number) => (
              <div
                key={user.firebase_uid}
                className="relative flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer hover:border-primary/50 transition-all hover:scale-105"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  const targetId = resolveTargetId(user);
                  if (targetId) handleUserRedirect(targetId);
                }}
              >
                <div className="relative">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full",
                      user.has_active_story
                        ? "p-0.5 bg-gradient-to-tr from-orange-500 via-pink-500 to-yellow-400"
                        : ""
                    )}
                  >
                    <img
                      src={getProfileImage(user)}
                      alt={user.full_name || user.username || "User"}
                      className="w-full h-full rounded-full object-cover border border-border"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getFallbackProfileImage(user);
                      }}
                    />
                  </div>
                  {user.is_creator && (
                    <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-primary to-secondary text-gray-900 dark:text-white text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-md border border-white flex items-center gap-1">
                      <Crown className="w-3 h-3 mr-0.5 inline-block" />
                      Creator
                    </span>
                  )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-base truncate">
                    {user.full_name || user.username || user.public_id || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    @{user.username || user.public_id || (user.full_name || "user").toLowerCase().replace(/\s+/g, "")}
                  </span>
                </div>

                <div className="ml-auto">
                  {user.follow_status === "following" ? (
                    <button disabled className="px-4 py-1.5 rounded-full bg-muted border border-border text-xs">
                      Following
                    </button>
                  ) : user.follow_status === "requested" ? (
                    <button disabled className="px-4 py-1.5 rounded-full bg-muted border border-border text-xs">
                      Requested
                    </button>
                  ) : user.follow_status === "pending" ? (
                    <button disabled className="px-4 py-1.5 rounded-full bg-muted border border-border text-xs">
                      Pending
                    </button>
                  ) : (
                    <button
                      className="px-4 py-1.5 rounded-full bg-primary text-gray-900 dark:text-white text-xs hover:bg-primary/90 transition-all"
                      disabled={actionLoading === user.firebase_uid}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowClick(user, idx);
                      }}
                    >
                      {actionLoading === user.firebase_uid ? "..." : "Follow"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= PROMPT RESULTS ================= */}
        {promptResults.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-3">Prompts</h3>

            <div
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              style={{ gridAutoRows: "120px" }}
            >
              {promptResults.map((post, index) => {
                const validImage =
                  typeof post.image_url === "string" &&
                  post.image_url.trim() !== "";

                const fallbackImage = "/broken-image.png";

                return (
                  <div
                    key={post._id}
                    className={cn(
                      "relative rounded-2xl overflow-hidden cursor-pointer group border border-border bg-card hover:border-primary/50 transition-all",
                      index === 0
                        ? "col-span-2 row-span-2"
                        : index < 3
                        ? "col-span-1 row-span-2"
                        : "col-span-1 row-span-1"
                    )}
                    onClick={() =>
                      post.prompt_id && navigate(`/remix/${post.prompt_id}`)
                    }
                  >
                    <img
                      src={validImage ? post.image_url : fallbackImage}
                      alt={post.prompt_badge || "Remix"}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackImage;
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
                      <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">
                        {post.prompt_badge
                          ? post.prompt_badge.toUpperCase()
                          : "Remix"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= NO RESULTS ================= */}
        {searchResults.length === 0 && promptResults.length === 0 && (
          <div className="text-center text-muted-foreground py-6">
            No results found.
          </div>
        )}
      </>
    )}
  </div>
)}
        {!searchQuery.trim() && (
          <div className="w-full min-h-screen pb-24 md:pb-8 bg-background overflow-x-hidden">
            <div className="max-w-2xl md:max-w-6xl mx-auto">
                  <div className="relative z-10 bg-background/95 backdrop-blur-sm py-0 sm:py-1 px-3 sm:px-4 md:px-6 mb-1 sm:mb-3">
         <StoriesRow />
          </div>
        {/* Spotlight Section */}
        {spotlightLoading ? (
          <SpotlightSkeleton />
        ) : (
          <div
            className="relative mb-8 rounded-3xl overflow-hidden group cursor-pointer"
            onClick={() => {
              if (activeSpotlightAd?.publisher_id) {
                navigate(`/publisher/business-profile/${activeSpotlightAd.publisher_id}`);
              }
            }}
          >
            <div className="aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1] w-full">
              {activeSpotlightAd?.video_preview_url && !activeSpotlightAd?.photo_preview_url ? (
                <video
                  src={activeSpotlightAd.video_preview_url}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={activeSpotlightAd?.photo_preview_url || spotlightArt.image || heroBanner}
                  alt={activeSpotlightAd?.ad_name || spotlightArt.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
            </div>
          
          {/* Spotlight Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />
          
          {/* Spotlight Badge */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold backdrop-blur-sm">
            <Crown className="w-4 sm:w-4 h-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Today's Spotlight</span>
            <span className="sm:hidden">Spotlight</span>
          </div>
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-primary font-medium mb-1 truncate">
                  {activeSpotlightAd ? "Sponsored Spotlight" : spotlightArt.style}
                </p>
                <h2 className="text-base sm:text-2xl font-display font-bold mb-2 line-clamp-2 sm:line-clamp-none">
                  {activeSpotlightAd?.ad_name || spotlightArt.title}
                </h2>
                <div className="flex items-center gap-2 sm:gap-3">
                  <img 
                    src={activeSpotlightAd ? profileIcon : spotlightArt.creatorAvatar}
                    alt={activeSpotlightAd?.business_name || spotlightArt.creator}
                    className="w-7 sm:w-8 h-7 sm:h-8 rounded-full border-2 border-primary flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm font-medium truncate">
                    {activeSpotlightAd?.business_name || spotlightArt.creator}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-shrink-0">
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Trending Styles (Remix Posts) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-lg sm:text-xl font-display font-semibold min-w-0">Trending Styles</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAllTrending((prev) => !prev)}
                className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary/70 hover:bg-primary/5"
              >
                {showAllTrending ? 'Show less' : `Show all (${remixPosts.length})`}
              </button>
              <button
                onClick={() => navigate('/trending')}
                className="inline-flex items-center rounded-full text-xs text-primary/80 hover:text-primary transition group"
                title="Open full trending page"
              >
                <span className="text-sm font-semibold text-[#FF6B00] mr-2">See All</span>
                <span className="transform transition-transform group-hover:translate-x-1">→</span>
              </button>
            </div>
          </div>

          <div className="w-full relative">
            {showNav && (
              <>
                <button
                  onClick={() => trendingRef.current?.scrollBy({ left: -(trendingRef.current.clientWidth * 0.8), behavior: 'smooth' })}
                  className="hidden md:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow z-20 hover:scale-105 transition-transform"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-5 h-5 text-black" />
                </button>
                <button
                  onClick={() => trendingRef.current?.scrollBy({ left: trendingRef.current.clientWidth * 0.8, behavior: 'smooth' })}
                  className="hidden md:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow z-20 hover:scale-105 transition-transform"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-5 h-5 text-black" />
                </button>
              </>
            )}

            <div
              ref={trendingRef}
              className="w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex gap-4 px-4 sm:px-2 pb-3">
                {displayedTrendingPosts.length > 0 ? (
                  displayedTrendingPosts.map((post, idx) => {
                    const validImage = typeof post.image_url === "string" && post.image_url.trim() !== "";
                    const fallbackImage = "/broken-image.png";
                    const author = userProfiles[post.user_id];
                    const avatar = author ? getProfileImage(author) : profileIcon;
                    return (
                      <div
                        key={post._id}
                        className={cn(
                          "min-w-[220px] sm:min-w-[240px] md:min-w-[260px] lg:min-w-[280px] rounded-3xl overflow-hidden border border-border bg-card shadow-sm cursor-pointer group flex-shrink-0 snap-start transition-transform duration-300 hover:-translate-y-0.5",
                          idx === 0 ? "md:min-w-[320px] lg:min-w-[360px]" : ""
                        )}
                        onClick={() => post.prompt_id && navigate(`/remix/${post.prompt_id}`)}
                      >
                        <div className="relative h-[280px] overflow-hidden bg-muted">
                          <img
                            src={validImage ? post.image_url : fallbackImage}
                            alt={post.prompt_badge || "Remix"}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = fallbackImage;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-4">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{post.prompt_badge || "Remix"}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (author?.firebase_uid) handleUserRedirect(author.firebase_uid);
                            }}
                            className="flex items-center gap-3 min-w-0 text-left"
                          >
                            <img
                              src={avatar}
                              alt={getDisplayName(author)}
                              className="w-11 h-11 rounded-full object-cover border border-border"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = profileIcon;
                              }}
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate text-left">{getDisplayName(author)}</p>
                              <p className="text-xs text-muted-foreground truncate text-left">@{author?.username || author?.public_id || getDisplayName(author).toLowerCase().replace(/\s+/g, "")}</p>
                            </div>
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="w-4 h-4 text-rose-500" />
                            {formatCount(Number(post.likes?.length || 0))}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-4 h-4 text-yellow-300" />
                            {formatCount(Number(post.views?.length || 0))}
                          </span>
                        </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="min-w-[220px] rounded-3xl border border-border bg-card p-6 flex items-center justify-center text-muted-foreground">
                    No trending remixes yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Creators / Leaderboard */}
        <div className="mb-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
             
              <h3 className="text-lg sm:text-xl font-display font-semibold">Top Creators</h3>
            </div>
            <button
              onClick={() => navigate('/leaderboard')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {creatorsLoading ? (
            <TopCreatorsSkeleton />
          ) : (
          <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4 items-end">
            {topCreators.length >= 3 ? [topCreators[2], topCreators[0], topCreators[1]].map((creator, index) => {
              const isFirst = index === 1;
              const isSecond = index === 2;
              const isThird = index === 0;
              const label = isFirst ? 1 : isSecond ? 2 : 3;
              const badgeClass = isFirst
                ? 'w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 to-amber-500'
                : isSecond
                  ? 'w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-500 to-sky-500'
                  : 'w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-400 to-slate-500';
              const sizeClass = isFirst ? 'w-20 h-20 sm:w-28 sm:h-28 border-yellow-400 shadow-xl' : 'w-16 h-16 sm:w-24 sm:h-24';
              const cardBg = isFirst
                ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900 shadow-lg'
                : isSecond
                  ? 'bg-gradient-to-br from-cyan-500 to-sky-600 text-gray-900 dark:text-white shadow-lg'
                  : 'bg-gradient-to-br from-slate-500 to-slate-600 text-gray-900 dark:text-white';
              const borderClass = isFirst ? 'border-yellow-400' : isSecond ? 'border-cyan-500' : 'border-slate-400';

              return (
                <div
                  key={creator.firebase_uid}
                  onClick={() => navigate(`/user/${creator.firebase_uid}`)}
                  className={cn(
                    'flex flex-col items-center cursor-pointer group',
                    isFirst ? 'transform scale-100 sm:scale-110' : ''
                  )}
                >
                  <div className="relative mb-2 sm:mb-3">
                    {isFirst && (
                      <Crown className="absolute -top-4 sm:-top-6 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 animate-bounce" />
                    )}
                    <div className={cn(
                      'absolute -top-1 sm:-top-2 -right-1 sm:-right-2 rounded-full flex items-center justify-center z-10 shadow-lg',
                      badgeClass
                    )}>
                      <span className="text-xs sm:text-base font-bold text-gray-900 dark:text-white">{label}</span>
                    </div>
                    <img
                      src={getProfileImage(creator)}
                      alt={getDisplayName(creator)}
                      className={cn(
                        'rounded-full object-cover border-4 transition-transform group-hover:scale-110',
                        sizeClass,
                        borderClass
                      )}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getFallbackProfileImage(creator);
                      }}
                    />
                  </div>

                  <div className={cn(
                    'rounded-t-lg sm:rounded-t-2xl w-full p-2 sm:p-4 text-center',
                    cardBg
                  )}>
                    <p className="font-semibold text-xs sm:text-base truncate">{getDisplayName(creator)}</p>
                    <p className={cn('text-xs mt-0.5 sm:mt-1', isFirst ? 'font-semibold text-gray-800' : 'text-gray-900 dark:text-white')}>
                      {creator.total_remix_count || 0} remixes
                    </p>
                  </div>
                </div>
              );
            }) : topCreators.map((creator, index) => {
              const isFirst = index === 0;
              const label = index + 1;
              const badgeClass = isFirst
                ? 'w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 to-amber-500'
                : 'w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-cyan-500 to-sky-500';
              const sizeClass = isFirst ? 'w-20 h-20 sm:w-28 sm:h-28 border-yellow-400 shadow-xl' : 'w-16 h-16 sm:w-24 sm:h-24';

              return (
                <div
                  key={creator.firebase_uid}
                  onClick={() => navigate(`/user/${creator.firebase_uid}`)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div className="relative mb-2 sm:mb-3">
                    {isFirst && (
                      <Crown className="absolute -top-4 sm:-top-6 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 animate-bounce" />
                    )}
                    <div className={cn(
                      'absolute -top-1 sm:-top-2 -right-1 sm:-right-2 rounded-full flex items-center justify-center z-10 shadow-lg',
                      badgeClass
                    )}>
                      <span className="text-xs sm:text-base font-bold text-gray-900 dark:text-white">{label}</span>
                    </div>
                    <img
                      src={getProfileImage(creator)}
                      alt={getDisplayName(creator)}
                      className={cn(
                        'rounded-full object-cover border-4 transition-transform group-hover:scale-110',
                        sizeClass,
                        isFirst ? 'border-yellow-400' : 'border-cyan-500'
                      )}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getFallbackProfileImage(creator);
                      }}
                    />
                  </div>

                  <div className={cn(
                    'rounded-t-lg sm:rounded-t-2xl w-full p-2 sm:p-4 text-center',
                    isFirst ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900 shadow-lg' : 'bg-gradient-to-br from-cyan-500 to-sky-600 text-gray-900 dark:text-white shadow-lg'
                  )}>
                    <p className="font-semibold text-xs sm:text-base truncate">{getDisplayName(creator)}</p>
                    <p className={cn('text-xs mt-0.5 sm:mt-1', isFirst ? 'font-semibold text-gray-800' : 'text-gray-900 dark:text-white')}>
                      {creator.total_remix_count || 0} remixes
                    </p>
                  </div>
                </div>
              );
            })}

          {topCreators.length === 0 && !creatorsLoading && (
            <div className="col-span-3 text-muted-foreground py-8">No AI creators found.</div>
          )}
          </div>
          )}
        </div>

        <div className="sticky md:relative top-16 md:top-auto z-40 md:z-auto bg-background/95 backdrop-blur-sm py-2 sm:py-3 px-3 sm:px-4 md:px-6 mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-display font-semibold mb-4">Discover Art</h3>
          {!postsLoaded ? (
            <PostGridSkeleton />
          ) : (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 transition-opacity duration-300 w-full"
            style={{ gridAutoRows: "120px" }}
          >
            {gridPosts.length === 0 ? (
              <div className="col-span-3 text-center text-muted-foreground py-8">No posts yet.</div>
            ) : (
              gridPosts.map((post, index) => {
                // Debug: log the image_url for each post
                const author = userProfiles[post.user_id];
                const avatar = author ? getProfileImage(author) : profileIcon;
                return (
                  <div
                    key={post._id}
                    className={cn(
                      "relative rounded-2xl overflow-hidden cursor-pointer group",
                      index === 0 ? "col-span-2 row-span-2" : index < 3 ? "col-span-1 row-span-2" : "col-span-1 row-span-1"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/discoverview/${post._id}`)}

                  >
                    {post.type === "video" && post.video_url ? (
                  <video
                    src={post.video_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    autoPlay
                    loop
                    preload="metadata"
                  />
                ) : (post.type === "text" || (!post.image_url && !post.video_url)) ? (
                  <div className="w-full h-full bg-gradient-to-br from-card via-card to-background text-foreground p-4 flex flex-col justify-center items-center text-center">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                      <span className="text-xs uppercase tracking-widest">Live text post</span>
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-6">{post.caption?.trim() || "Text post"}</p>
                  </div>
                ) : (
  <img
    src={post.image_url || post.video_url || "/broken-image.png"}
    alt={post.caption || "Post"}
    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
    onError={(e) => {
      e.currentTarget.onerror = null;
      e.currentTarget.src = "/broken-image.png";
    }}
  />
)}

                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black/80 to-transparent translate-y-0 opacity-100 transition-all duration-300">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                          {post.caption || "Post"}
                        </p>
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
                            className="w-8 h-8 rounded-full object-cover border border-white/30"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = profileIcon;
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{getDisplayName(author)}</p>
                            <p className="text-[11px] text-muted-foreground truncate">@{author?.username || author?.public_id || getDisplayName(author).toLowerCase().replace(/\s+/g, "")}</p>
                          </div>
                        </button>
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/0 group-hover:ring-primary/50 transition-all duration-300" />
                  </div>
                );
              })
            )}
          </div>
          )}
        </div>

        {/* Load More */}
        <div className="flex justify-center py-8">
          <button
            onClick={() => navigate("/discoverview")}
            className="px-8 py-3 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all font-medium text-base"
          >
            Explore More
          </button>
        </div>
      </div>
            </div>
        )}
        </div>
  
  </MainLayout>
);
};

export default Explore;
