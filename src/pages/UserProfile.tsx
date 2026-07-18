import { MainLayout } from "@/components/layout/MainLayout";
import {
  MessageCircle,
  UserPlus,
  UserCheck,
  UserX,
  Grid,
  Award,
  Heart,
  MapPin,
  Calendar,
  BadgeCheck,
  Clock,
  ArrowLeft,
  Instagram,
  Youtube,
  Facebook,
  Share2,
  MoreVertical,
  Info,
} from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import avatar2 from "@/assets/avatar-2.jpg";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import heroBanner from "@/assets/hero-banner2.png";
import creatorLog1o from "@/assets/ai-creator-icon-2.png";
import { auth } from "@/firebase";
import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.kirnagram.com";
const REMIX_API_BASE = import.meta.env.VITE_REMIX_API_BASE || API_BASE;

const tabs = [
  { id: "posts", label: "Posts", icon: Grid },
  { id: "prompts", label: "Prompts", icon: Award },
  { id: "remixes", label: "Remixes", icon: Heart },
];

const emptyMessages: Record<string, string> = {
  posts: "No posts yet",
  prompts: "No prompts yet",
  remixes: "No remixes yet",
};

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("posts");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [followStatus, setFollowStatus] = useState<"following" | "requested" | "pending" | "none">("none");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [hasActiveStory, setHasActiveStory] = useState(false);
  const [firstStoryId, setFirstStoryId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userPromptPosts, setUserPromptPosts] = useState<any[]>([]);
  const [userRemixes, setUserRemixes] = useState<any[]>([]);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [aboutInfo, setAboutInfo] = useState<any>(null);
  const [aboutLoading, setAboutLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const applyStoryFromProfile = (data: any) => {
    const active = Boolean(data?.has_active_story || data?.first_story_id);
    setHasActiveStory(active);
    setFirstStoryId(data?.first_story_id || null);
    setUserStories(active ? [{ story_id: data?.first_story_id }] : []);
  };

  const resolveTargetId = (obj: any, fallback?: string) => {
    return obj?.firebase_uid || obj?._id || obj?.public_id || obj?.username || fallback;
  };

  const refreshTargetProfileMeta = async (token: string, targetUserId: string) => {
    const refreshedRes = await fetch(`${API_BASE}/follow/${targetUserId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!refreshedRes.ok) return;

    const refreshed = await refreshedRes.json();
    setProfile((prev: any) => ({ ...prev, ...refreshed }));
    setFollowStatus((refreshed.follow_status || "none") as any);
    applyStoryFromProfile(refreshed);
  };

  // Load current user and target profile
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user && userId && userId !== "undefined") {
        try {
          const token = await user.getIdToken();
          
          // Fetch target user profile
          const res = await fetch(`${API_BASE}/follow/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            throw new Error(`Profile fetch failed: ${res.status}`);
          }

          const data = await res.json();
          setProfile(data);
          setFollowStatus((data.follow_status || "none") as any);
          applyStoryFromProfile(data);

          if (data.account_type === "private" && data.follow_status !== "following" && data.is_creator) {
            setActiveTab("prompts");
          }

          const postsRes = await fetch(`${API_BASE}/posts/user/${resolveTargetId(data, userId)}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (postsRes.ok) {
            const postsData = await postsRes.json();
            const posts = Array.isArray(postsData) ? postsData : [];
            const promptPosts = posts.filter((p: any) => p.is_prompt_post);
            const normalPosts = posts.filter((p: any) => !p.is_prompt_post);
            setUserPosts(normalPosts);
            setUserPromptPosts(promptPosts);
          } else {
            setUserPosts([]);
            setUserPromptPosts([]);
          }

          const remixesRes = await fetch(`${REMIX_API_BASE}/remix/user/${resolveTargetId(data, userId)}/remixes`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (remixesRes.ok) {
            const remixesData = await remixesRes.json();
            setUserRemixes(remixesData.remixes || []);
          } else {
            setUserRemixes([]);
          }

        } catch (error) {
          console.error("Failed to load profile:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const handleFollowAction = async () => {
    if (!currentUser || !profile || isActionLoading) return;

    setIsActionLoading(true);
    try {
      const token = await currentUser.getIdToken();
      
      const targetId = resolveTargetId(profile, userId);
      if (!targetId) {
        console.warn("No valid target id for follow request");
        return;
      }

      if (followStatus === "following" || followStatus === "requested") {
        // Unfollow
        const res = await fetch(`${API_BASE}/follow/unfollow/${targetId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          setFollowStatus("none");
          await refreshTargetProfileMeta(token, targetId);
        }
      } else if (followStatus === "pending") {
        // Follow back
        const res = await fetch(`${API_BASE}/follow/follow-back/${targetId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setFollowStatus(data.follow_status as any);
          await refreshTargetProfileMeta(token, targetId);
        }
      } else {
        // Send follow request
        const res = await fetch(`${API_BASE}/follow/send-request/${targetId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setFollowStatus(data.follow_status as any);
          await refreshTargetProfileMeta(token, targetId);
        }
      }
    } catch (error) {
      console.error("Follow action failed:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const openPost = (index: number) => {
    navigate("/posts", {
      state: {
        posts: userPosts,
        startIndex: index,
        initialPostId: userPosts[index]?._id,
        viewType: "posts",
      },
    });
  };

  const handleShare = async () => {
    const username = profile?.username || profile?.full_name?.toLowerCase().replace(/\s+/g, "");
    const shareUrl = `${window.location.origin}/${username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.full_name || "Kirnagram", url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Profile link copied!");
      }
    } catch {
      // user cancelled or error
    }
  };

  const loadAboutInfo = async () => {
    if (!currentUser || !profile) return;
    
    try {
      setAboutLoading(true);
      const token = await currentUser.getIdToken();
      const targetIdentifier = profile.firebase_uid || profile.username || userId;
      const res = await fetch(`https://api.kirnagram.com/profile/about/${targetIdentifier}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAboutInfo({
          full_name_change_count: 0,
          username_change_count: 0,
          ...data,
        });
      } else {
        setAboutInfo({
          firebase_uid: profile.firebase_uid,
          username: profile.username,
          full_name: profile.full_name,
          joined_date: profile.created_at || null,
          full_name_change_count: 0,
          username_change_count: 0,
          location: profile.location || null,
        });
      }
      setShowAboutModal(true);
    } catch (error) {
      console.error("Failed to load about info:", error);
      setAboutInfo({
        firebase_uid: profile.firebase_uid,
        username: profile.username,
        full_name: profile.full_name,
        joined_date: profile.created_at || null,
        full_name_change_count: 0,
        username_change_count: 0,
        location: profile.location || null,
      });
      setShowAboutModal(true);
    } finally {
      setAboutLoading(false);
    }
  };

  const openPromptPost = (index: number) => {
    navigate("/posts", {
      state: {
        posts: userPromptPosts,
        startIndex: index,
        initialPostId: userPromptPosts[index]?._id,
        viewType: "prompts",
      },
    });
  };

  useEffect(() => {
    if (!showMenuDropdown) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setShowMenuDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMenuDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenuDropdown]);

  // Show loading state
  if (loading) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-4xl mx-auto pb-20 md:pb-0 flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </MainLayout>
    );
  }

  // Handle missing profile
  if (!profile) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-4xl mx-auto pb-20 md:pb-0 flex items-center justify-center h-96">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </MainLayout>
    );
  }

  // Check if private account
  const isPrivateAccount = profile.account_type === "private";
  const isFollowing = followStatus === "following";
  const canViewFullProfile = !isPrivateAccount || isFollowing || currentUser?.uid === profile.firebase_uid;
  const canViewPromptPosts = Boolean(profile.is_creator);
  const canMessage = canViewFullProfile || currentUser?.uid === profile.firebase_uid;

  const isValidRemoteImage = (url?: string) =>
    typeof url === "string" &&
    url.trim() !== "" &&
    url.startsWith("http") &&
    !url.includes("default") &&
    !url.includes("placeholder") &&
    !url.startsWith("blob:");

  const withCacheBust = (url: string) =>
    `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;

  const fallbackAvatar = isValidRemoteImage(profile.image_name)
    ? withCacheBust(profile.image_name)
    : profile.gender === "male"
      ? maleIcon
      : profile.gender === "female"
        ? femaleIcon
        : profileIcon;

  const coverImage = isValidRemoteImage(profile.cover_image)
    ? withCacheBust(profile.cover_image)
    : heroBanner;

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto pb-20 md:pb-0 overflow-x-hidden">
        {/* Cover Photo with Back Button */}
        <div className="relative h-36 sm:h-48 md:h-64 rounded-none sm:rounded-2xl overflow-hidden">
          <img
            src={coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Three Dot Menu */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4" ref={menuRef}>
            <div className="relative">
              <button
                onClick={() => setShowMenuDropdown((prev) => !prev)}
                className="p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenuDropdown && (
                <div className="absolute right-0 top-full mt-2 w-44 sm:w-48 max-w-[calc(100vw-1.5rem)] rounded-lg bg-muted/95 border border-border/50 shadow-lg z-[70]">
                  <button
                    onClick={() => {
                      handleShare();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors first:rounded-t-lg flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Profile
                  </button>
                  <button
                    onClick={() => {
                      loadAboutInfo();
                      setShowMenuDropdown(false);
                    }}
                    disabled={aboutLoading}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors last:rounded-b-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    About this account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="relative px-4 -mt-16 sm:-mt-20">
          <div className="flex gap-4 mb-4">
            {/* Avatar on left */}
            <div className="relative flex-shrink-0">
              <div 
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded-full",
                  hasActiveStory
                    ? "p-1 bg-gradient-to-tr from-orange-500 via-pink-500 to-yellow-400 cursor-pointer hover:scale-105 transition-transform"
                    : ""
                )}
                onClick={() => {
                  if (hasActiveStory && firstStoryId) {
                    navigate(`/story/view/${firstStoryId}`, {
                      state: { userId: profile.firebase_uid }
                    });
                  }
                }}
              >
                <img
                  src={fallbackAvatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover border-4 border-background"
                />
              </div>
              <div className="absolute bottom-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-background" />
            </div>

            {/* Stats on right (Instagram mobile style) */}
            <div className="flex-1 flex items-center justify-around pt-8">
              <div className="text-center">
                <p className="text-lg font-display font-bold">
                  {profile.posts_count ?? userPosts.length}
                </p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>

              {Boolean(profile.is_creator) && (
                <div className="text-center">
                  <p className="text-lg font-display font-bold">
                    {profile.prompts_count ?? userPromptPosts.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Prompts</p>
                </div>
              )}

              {canViewFullProfile ? (
                <Link to={`/user/${userId}/followers`} className="text-center hover:opacity-80 transition-opacity">
                  <p className="text-lg font-display font-bold">
                    {profile.followers_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </Link>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-display font-bold">
                    {profile.followers_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
              )}

              {canViewFullProfile ? (
                <Link to={`/user/${userId}/following`} className="text-center hover:opacity-80 transition-opacity">
                  <p className="text-lg font-display font-bold">
                    {profile.following_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </Link>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-display font-bold">
                    {profile.following_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              )}
            </div>
          </div>

          {/* Name, Badge, and Social Icons (conditional) */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-base sm:text-lg font-display font-bold">
                {profile.full_name || profile.username || profile.public_id || "User"}
              </h1>
              {profile.account_type === "private" && (
                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">PRIVATE</span>
              )}
              {Boolean(profile.is_creator) && (
                
                  <img src={creatorLog1o} alt="Creator" className="w-4 h-4 object-contain" />
                
              )}
            </div>
            {/* Username or Public ID handle (one value) */}
            <p className="text-muted-foreground text-sm">
              {profile.username
                ? `@${profile.username}`
                : profile.public_id
                  ? `@${profile.public_id}`
                  : "@user"}
            </p>

            {/* Social Media Icons for Creator (always visible for creators, even private) */}
            {Boolean(profile.is_creator) && (
              <div className="flex gap-2 mt-2">
                {profile.instagram && (
                  <a href={profile.instagram} target="_blank" rel="noopener noreferrer" title="Instagram" className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center hover:scale-110 transition-transform">
                    <Instagram className="w-4 h-4 text-gray-900 dark:text-white" />
                  </a>
                )}
                {profile.youtube && (
                  <a href={profile.youtube} target="_blank" rel="noopener noreferrer" title="YouTube" className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-transform">
                    <Youtube className="w-4 h-4 text-gray-900 dark:text-white" />
                  </a>
                )}
                {profile.facebook && (
                  <a href={profile.facebook} target="_blank" rel="noopener noreferrer" title="Facebook" className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center hover:scale-110 transition-transform">
                    <Facebook className="w-4 h-4 text-gray-900 dark:text-white" />
                  </a>
                )}
                {profile.x && (
                  <a href={profile.x} target="_blank" rel="noopener noreferrer" title="X (Twitter)" className="w-9 h-9 rounded-full bg-black dark:bg-white flex items-center justify-center hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-gray-900 dark:text-white dark:text-black" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.46 5.924c-.793.352-1.645.59-2.54.698a4.48 4.48 0 0 0 1.963-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 16.11 4c-2.48 0-4.49 2.01-4.49 4.49 0 .352.04.695.116 1.022C7.728 9.36 4.1 7.6 1.67 4.98c-.386.664-.607 1.437-.607 2.26 0 1.56.795 2.94 2.005 3.75a4.48 4.48 0 0 1-2.034-.563v.057c0 2.18 1.55 4 3.6 4.42-.377.104-.775.16-1.185.16-.29 0-.57-.028-.845-.08.57 1.78 2.23 3.08 4.2 3.12A8.98 8.98 0 0 1 2 19.54a12.7 12.7 0 0 0 6.88 2.02c8.26 0 12.78-6.84 12.78-12.78 0-.195-.004-.39-.013-.583A9.1 9.1 0 0 0 24 4.59a8.98 8.98 0 0 1-2.54.698z"/>
                    </svg>
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-8.5 19h-3v-8h3v8zm-1.5-9.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 9.268h-3v-4.5c0-1.07-.93-2-2-2s-2 .93-2 2v4.5h-3v-8h3v1.085c.41-.63 1.36-1.085 2.5-1.085 1.93 0 3.5 1.57 3.5 3.5v4.5z"/>
                    </svg>
                  </a>
                )}
                {profile.whatsapp && (
                  <a href={profile.whatsapp} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" title={profile.website_name || "Website"} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons - Instagram Style */}
          <div className="flex gap-2 mb-4">
            {followStatus === "following" ? (
              <>
                <button
                  onClick={handleFollowAction}
                  disabled={isActionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80 transition-all disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Following</span>
                </button>
                <button
                  onClick={() => navigate('/messenger-coming-soon')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>
              </>
            ) : followStatus === "requested" ? (
              <button
                onClick={handleFollowAction}
                disabled={isActionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80 transition-all disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                <span>Requested</span>
              </button>
            ) : followStatus === "pending" ? (
              <>
                <button
                  onClick={handleFollowAction}
                  disabled={isActionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-semibold text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Follow Back</span>
                </button>
                <button
                  onClick={() => navigate('/messenger-coming-soon')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleFollowAction}
                disabled={isActionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-semibold text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Follow</span>
              </button>
            )}
          </div>

          {/* Bio and extras only when allowed */}
          {canViewFullProfile && (
            <div className="mt-4 space-y-3">
              <p className="text-foreground text-sm sm:text-base">{profile.bio || "No bio added yet"}</p>

              <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-muted-foreground">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <span className="flex items-center gap-1">
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {profile.website}
                    </a>
                  </span>
                )}
                {profile.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Private Account Message */}
          {!canViewFullProfile && activeTab !== "prompts" && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">This is a private account</p>
              <p className="text-sm text-muted-foreground">
                {followStatus === "requested" 
                  ? "Follow request pending approval"
                  : "Follow to see posts and more"}
              </p>
            </div>
          )}
        </div>

        {/* Tabs and Content */}
        {(canViewFullProfile || canViewPromptPosts) && (
          <>
            {/* Tabs */}
            <div className="mt-6 border-b border-border">
              <div className="flex gap-1 px-4">
                {tabs
                  .filter((tab) => {
                    if (tab.id === "posts") return canViewFullProfile;
                    if (tab.id === "prompts") return canViewPromptPosts;
                    if (tab.id === "remixes") return canViewFullProfile || profile.firebase_uid === currentUser?.uid;
                    return true;
                  })
                  .map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors relative",
                        activeTab === tab.id
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {activeTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {activeTab === "posts" && canViewFullProfile ? (
              userPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-2">
                  {userPosts.map((post: any, index: number) => (
                    <button
                      key={post._id}
                      type="button"
                      className="group relative aspect-square overflow-hidden bg-muted"
                      onClick={() => openPost(index)}
                    >
                      {(post.type === "text" || (!post.image_url && !post.video_url)) ? (
                        <div className="h-full w-full p-3 overflow-hidden text-left bg-slate-100 dark:bg-gray-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
                          <p className="text-xs leading-snug line-clamp-5 break-words whitespace-pre-wrap">
                            {post.caption || "Text post"}
                          </p>
                        </div>
                      ) : post.video_url ? (
                        <video
                          src={post.video_url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={post.image_url}
                          alt={post.caption || "Post"}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-gray-900 dark:text-white text-xs sm:text-sm">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {post.comments?.length ?? 0}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                  <p className="text-sm sm:text-base font-medium">
                    {emptyMessages[activeTab]}
                  </p>
                  <p className="text-xs sm:text-sm">Check back later.</p>
                </div>
              )
            ) : activeTab === "prompts" && canViewPromptPosts ? (
              userPromptPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-2">
                  {userPromptPosts.map((post: any, index: number) => (
                    <button
                      key={post._id}
                      type="button"
                      className="group relative aspect-square overflow-hidden bg-muted"
                      onClick={() => openPromptPost(index)}
                    >
                      <span className="absolute top-2 right-2 z-10 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        {post.prompt_badge || "Prompt"}
                      </span>
                      <img
                        src={post.image_url}
                        alt={post.caption || "Prompt"}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-gray-900 dark:text-white text-xs sm:text-sm">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {post.comments?.length ?? 0}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                  <p className="text-sm sm:text-base font-medium">
                    {emptyMessages[activeTab]}
                  </p>
                  <p className="text-xs sm:text-sm">Check back later.</p>
                </div>
              )
            ) : activeTab === "remixes" ? (
              userRemixes.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-2">
                  {userRemixes.map((remix: any, index: number) => (
                    <button
                      key={remix.id}
                      type="button"
                      className="group relative aspect-square overflow-hidden bg-muted"
                      onClick={() => {
                        navigate("/remix-view", {
                          state: {
                            remixes: userRemixes,
                            startIndex: index,
                            fromProfile: true,
                          },
                        });
                      }}
                    >
                      <img
                        src={remix.image_url}
                        alt={`Remix ${index + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">
                        {new Date(remix.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                  <p className="text-sm sm:text-base font-medium">
                    {emptyMessages[activeTab]}
                  </p>
                  <p className="text-xs sm:text-sm">Check back later.</p>
                </div>
              )
            ) : null}
          </>
        )}

        {showAboutModal && aboutInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background border border-border/50 rounded-2xl shadow-lg max-w-md w-full max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold">About this account</h3>
                </div>
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors"
                  title="Close"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">ACCOUNT NAME</p>
                  <p className="text-sm font-medium">{aboutInfo.full_name || aboutInfo.username}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">USERNAME</p>
                  <p className="text-sm font-medium">@{aboutInfo.username}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">DATE JOINED</p>
                  <p className="text-sm font-medium">
                    {aboutInfo.joined_date
                      ? new Date(aboutInfo.joined_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Not available"}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground font-semibold mb-2">ACCOUNT CHANGES</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                      <span className="text-xs font-medium">Name changed</span>
                      <span className="text-sm font-bold text-primary">{aboutInfo.full_name_change_count || 0} time(s)</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                      <span className="text-xs font-medium">Username changed</span>
                      <span className="text-sm font-bold text-primary">{aboutInfo.username_change_count || 0} time(s)</span>
                    </div>
                  </div>
                </div>

                {aboutInfo.location && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold">LOCATION</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {aboutInfo.location}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border/50">
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default UserProfile;
