import { MainLayout } from "@/components/layout/MainLayout";
import {
  Settings,
  Share2,
  Edit,
  Grid,
  Bookmark,
  Heart,
  MessageCircle,
  Award,
  Link as LinkIcon,
  MapPin,
  Calendar,
  BadgeCheck,
  Youtube,
  Facebook,
  Instagram,
  Eye,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import avatar2 from "@/assets/avatar-2.jpg";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import heroBanner from "@/assets/hero-banner2.png";
import creatorLogo from "@/assets/ai-creator-icon-2.png";
import { auth } from "../firebase";
import { useEffect, useState, useRef } from "react";

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


const API_BASE = import.meta.env.VITE_API_BASE || "https://api.kirnagram.com";

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("posts");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myStories, setMyStories] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myPromptPosts, setMyPromptPosts] = useState<any[]>([]);
  const [remixes, setRemixes] = useState<any[]>([]);

  const [stats, setStats] = useState({
    posts: 0,
    prompts: 0,
    followers: 0,
    following: 0,
  });
  // Fetch remix history
  useEffect(() => {
    const loadRemixes = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE}/remix/my-remixes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;

      const data = await res.json();
      setRemixes(data.remixes || []);
    };

    loadRemixes();
  }, []);

  const openPost = (index: number) => {
    navigate("/posts", {
      state: {
        posts: myPosts,
        startIndex: index,
        viewType: "posts",
        fromProfile: true,
      },
    });
  };

  const openPromptPost = (index: number) => {
    navigate("/posts", {
      state: {
        posts: myPromptPosts,
        startIndex: index,
        viewType: "prompts",
        fromProfile: true,
      },
    });
  };

  // 🔥 STEP 1 — Add Ref Storage
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Check for JWT token from localStorage (new auth system)
        const token = localStorage.getItem("access_token");
        const userId = localStorage.getItem("user_id");

        if (!token || !userId) {
          // Fall back to Firebase auth for backward compatibility
          const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
              setLoading(false);
              return;
            }
            await loadProfileData(await user.getIdToken(), user.uid);
          });
          return () => unsubscribe();
        }

        await loadProfileData(token, userId);
      } catch (error) {
        console.error("Failed to load profile:", error);
        setLoading(false);
      }
    };

    const loadProfileData = async (token: string, userId: string) => {
      try {
        // Fetch profile
        const res = await fetch(`${API_BASE}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Profile fetch failed: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        setProfile(data);

        // Fetch stats
        const statsRes = await fetch(`${API_BASE}/profile/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!statsRes.ok) {
          throw new Error(`Stats fetch failed: ${statsRes.status} ${statsRes.statusText}`);
        }

        const statsData = await statsRes.json();
        setStats(statsData);

        // Fetch my stories
        const storiesRes = await fetch(`${API_BASE}/stories/my-stories`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (storiesRes.ok) {
          const storiesData = await storiesRes.json();
          const stories = Array.isArray(storiesData) ? storiesData : [];
          setMyStories(stories);
          console.log("📖 My stories loaded:", stories.length, stories);
        } else {
          console.error("❌ Failed to fetch stories:", storiesRes.status);
          setMyStories([]);
        }

        // Fetch my posts
        const postsRes = await fetch(`${API_BASE}/posts/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          const posts = Array.isArray(postsData) ? postsData : [];
          const promptPosts = posts.filter((p: any) => p.is_prompt_post);
          const normalPosts = posts.filter((p: any) => !p.is_prompt_post);
          setMyPosts(normalPosts);
          setMyPromptPosts(promptPosts);
        } else {
          console.error("❌ Failed to fetch posts:", postsRes.status);
          setMyPosts([]);
          setMyPromptPosts([]);
        }

      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // 🔥 STEP 2 — Add Auto Play Effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.currentTime = 0;
            video.play().catch(() => {});
            // Stop after 5 seconds
            setTimeout(() => {
              video.pause();
              video.currentTime = 0;
            }, 5000);
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { threshold: 0.6 }
    );
    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });
    return () => observer.disconnect();
  }, [myPosts]);

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
          <p className="text-muted-foreground">Failed to load profile</p>
        </div>
      </MainLayout>
    );
  }

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

  const websiteLink = profile.website
    ? profile.website.startsWith("http")
      ? profile.website
      : `https://${profile.website}`
    : "";

  // Debug story ring
  console.log("🎯 Rendering profile with myStories.length:", myStories.length);

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto pb-20 md:pb-0 overflow-x-hidden">
        {/* Cover Photo */}
        <div className="relative h-32 sm:h-48 md:h-64 rounded-none sm:rounded-2xl overflow-hidden">
          <img
            src={coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="relative px-4 -mt-16 sm:-mt-20">
          {/* Avatar and Actions Row */}
          <div className="flex items-end justify-between mb-4">
            {/* Avatar */}
            <div className="relative">
              <div 
                className={cn(
                  "w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full",
                  myStories.length > 0 
                    ? "p-1 bg-gradient-to-tr from-orange-500 via-pink-500 to-yellow-400 cursor-pointer hover:scale-105 transition-transform"
                    : ""
                )}
                onClick={() => {
                  if (myStories.length > 0 && myStories[0]?.story_id) {
                    navigate(`/story/view/${myStories[0].story_id}`);
                  }
                }}
              >
                 <img
                   src={fallbackAvatar || avatar2}
                   alt="Profile"
                   className="w-full h-full rounded-full object-cover border-4 border-background"
                 />
              </div>
              <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full border-2 border-background" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-2">
               <Link
                to="/edit-profile"
                className="flex items-center gap-2 px-4 py-2 glass-card hover:bg-gray-100 dark:hover:bg-muted/50 rounded-xl font-medium text-sm transition-all"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
              <button
                className="flex items-center gap-2 px-4 py-2 glass-card hover:bg-gray-100 dark:hover:bg-muted/50 rounded-xl font-medium text-sm transition-all"
                title="Share Profile"
                onClick={() => {
                  // Instagram-style URL with username directly
                  const profilePath = profile.username
                    ? `/${encodeURIComponent(profile.username)}`
                    : `/user/${profile.firebase_uid}`;
                  const url = window.location.origin + profilePath;
                  const displayUrl = profile.username
                    ? `${window.location.host}/${encodeURIComponent(profile.username)}`
                    : `${window.location.host}/user/${profile.firebase_uid}`;
                  navigator.clipboard.writeText(url);
                  toast({ title: "Profile link copied!", description: displayUrl });
                }}
              >
                <Share2 className="w-5 h-5 text-gray-700 dark:text-gray-900 dark:text-white" />
              </button>
              <Link
                to="/settings"
                className="p-2 glass-card hover:bg-gray-100 dark:hover:bg-muted/50 rounded-xl transition-all"
              >
                <Settings className="w-4 h-4 text-gray-700 dark:text-gray-900 dark:text-white" />
              </Link>
            </div>
          </div>

          {/* Name and Username */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-display font-bold">
                {profile.full_name || profile.username || profile.public_id || "User"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-sm">
                {`@${
                  profile.username
                    ? profile.username
                    : profile.public_id
                      ? profile.public_id
                      : profile.full_name?.toLowerCase().replace(/\s+/g, "") || "user"
                }`}
                {profile.public_id && profile.username ? (
                  <span className="ml-2 text-xs font-medium text-muted-foreground">ID: {profile.public_id}</span>
                ) : null}
              </p>
              {Boolean(profile.is_creator) && (
                
                  <img src={creatorLogo} alt="Creator" className="w-4 h-4 object-contain" />
                
              )}
            </div>
          </div>

          {/* Stats */}
         <div className="flex gap-6 py-4 border-y border-border">
  <div className="text-center">
    <p className="text-lg sm:text-xl md:text-2xl font-display font-bold">
      {stats.posts}
    </p>
    <p className="text-xs sm:text-sm text-muted-foreground">Posts</p>
  </div>

  {Boolean(profile.is_creator) && (
    <div className="text-center">
      <p className="text-lg sm:text-xl md:text-2xl font-display font-bold">
        {stats.prompts}
      </p>
      <p className="text-xs sm:text-sm text-muted-foreground">Prompts</p>
    </div>
  )}

  <Link to={`/user/${profile.firebase_uid}/followers`} className="text-center hover:opacity-80 transition-opacity">
    <p className="text-lg sm:text-xl md:text-2xl font-display font-bold">
      {stats.followers}
    </p>
    <p className="text-xs sm:text-sm text-muted-foreground">Followers</p>
  </Link>

  <Link to={`/user/${profile.firebase_uid}/following`} className="text-center hover:opacity-80 transition-opacity">
    <p className="text-lg sm:text-xl md:text-2xl font-display font-bold">
      {stats.following}
    </p>
    <p className="text-xs sm:text-sm text-muted-foreground">Following</p>
  </Link>
</div>
          {/* Social Media Icons Row */}
          <div className="flex gap-4 justify-center py-4 border-y border-border">
            {profile.instagram && (
              <a href={profile.instagram} target="_blank" rel="noopener noreferrer" title="Instagram" className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center hover:scale-110 transition-transform">
                <Instagram className="w-5 h-5 text-gray-900 dark:text-white" />
              </a>
            )}
            {profile.youtube && (
              <a href={profile.youtube} target="_blank" rel="noopener noreferrer" title="YouTube" className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center hover:scale-110 transition-transform">
                <Youtube className="w-5 h-5 text-gray-900 dark:text-white" />
              </a>
            )}
            {profile.facebook && (
              <a href={profile.facebook} target="_blank" rel="noopener noreferrer" title="Facebook" className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center hover:scale-110 transition-transform">
                <Facebook className="w-5 h-5 text-gray-900 dark:text-white" />
              </a>
            )}
            {profile.x && (
              <a href={profile.x} target="_blank" rel="noopener noreferrer" title="X (Twitter)" className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-gray-900 dark:text-white dark:text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.46 5.924c-.793.352-1.645.59-2.54.698a4.48 4.48 0 0 0 1.963-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 16.11 4c-2.48 0-4.49 2.01-4.49 4.49 0 .352.04.695.116 1.022C7.728 9.36 4.1 7.6 1.67 4.98c-.386.664-.607 1.437-.607 2.26 0 1.56.795 2.94 2.005 3.75a4.48 4.48 0 0 1-2.034-.563v.057c0 2.18 1.55 4 3.6 4.42-.377.104-.775.16-1.185.16-.29 0-.57-.028-.845-.08.57 1.78 2.23 3.08 4.2 3.12A8.98 8.98 0 0 1 2 19.54a12.7 12.7 0 0 0 6.88 2.02c8.26 0 12.78-6.84 12.78-12.78 0-.195-.004-.39-.013-.583A9.1 9.1 0 0 0 24 4.59a8.98 8.98 0 0 1-2.54.698z"/>
                </svg>
              </a>
            )}
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-8.5 19h-3v-8h3v8zm-1.5-9.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 9.268h-3v-4.5c0-1.07-.93-2-2-2s-2 .93-2 2v4.5h-3v-8h3v1.085c.41-.63 1.36-1.085 2.5-1.085 1.93 0 3.5 1.57 3.5 3.5v4.5z"/>
                </svg>
              </a>
            )}
            {profile.whatsapp && (
              <a href={profile.whatsapp} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            )}
          </div>
          {/* Bio */}
          <div className="mt-4 space-y-3">
            <p className="text-foreground text-sm sm:text-base">{profile.bio || "No bio added yet"}</p>


            <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profile.location || "Location not set"}
              </span>
              <span className="flex items-center gap-1">
              <LinkIcon className="w-4 h-4" />
               {profile.website ? (
               <a
               href={websiteLink}
               target="_blank"
               rel="noreferrer"
               className="text-primary hover:underline"
               >
               {profile.website}
                </a>
              ) : (
              "No website"
             )}
            </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
              </span>
             
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-border">
          <div className="flex gap-1 px-4">
            {tabs.filter((tab) => (tab.id === "prompts" ? Boolean(profile.is_creator) : true)).map((tab) => (
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

        {activeTab === "posts" ? (
          myPosts.length > 0 ? (
            // ✅ Updated Posts Grid
            <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-2">
              {myPosts.map((post: any, index: number) => (
                <button
                  key={post._id}
                  type="button"
                  className="group relative aspect-square overflow-hidden bg-muted"
                  onClick={() => openPost(index)}
                >
                  {(post.type === "text" || (!post.image_url && !post.video_url)) ? (
                    <div className="flex h-full w-full items-center justify-center p-3 text-left bg-slate-100 dark:bg-gray-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
                      <p className="text-sm leading-relaxed overflow-hidden text-ellipsis line-clamp-5">
                        {post.caption || "Text post"}
                      </p>
                    </div>
                  ) : post.video_url ? (
                    <video
                      ref={(el) => (videoRefs.current[index] = el)}
                      src={post.video_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={post.image_url}
                      alt={post.caption || "Post"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  {/* Overlay Stats */}
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
        ) : activeTab === "prompts" ? (
          myPromptPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-2">
              {myPromptPosts.map((post: any, index: number) => (
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
          remixes.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-2">
              {remixes.map((item: any, index: number) => (
                <button
                  key={item.id}
                  type="button"
                  className="group relative aspect-square overflow-hidden bg-muted"
                  onClick={() =>
                    navigate("/remix-view", {
                      state: {
                        remixes,
                        startIndex: index,
                        fromProfile: true,
                      },
                    })
                  }
                >
                  {item.review_rating ? (
                    <span className={`absolute left-2 top-2 z-10 rounded-full px-2 py-1 text-[10px] font-semibold ${item.review_rating === "good" ? "bg-emerald-500/90 text-gray-900 dark:text-white" : "bg-rose-500/90 text-gray-900 dark:text-white"}`}>
                      {item.review_rating === "good" ? "Good" : "Bad"}
                    </span>
                  ) : null}
                  <img
                    src={item.image_url}
                    alt={item.caption || "Remix"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Always show view count in bottom left for consistency */}
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
        ) : (
          <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
            <p className="text-sm sm:text-base font-medium">
              {emptyMessages[activeTab]}
            </p>
            <p className="text-xs sm:text-sm">Check back later.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;
