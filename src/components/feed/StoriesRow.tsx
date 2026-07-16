import { Plus, Heart, MessageCircle, Share2, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "@/firebase";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import profileIcon from "@/assets/profileicon.png";

interface Story {
  story_id: string;
  user_id: string;
  username?: string;
  public_id?: string;
  full_name?: string;
  user_image?: string;
  media_url: string;
  media_type: string;
  duration: number;
  created_at: string;
  expires_at: string;
  views_count: number;
  likes_count: number;
  viewed_by_user: boolean;
  liked_by_user: boolean;
}

interface StoryUser {
  user_id: string;
  username?: string;
  public_id?: string;
  full_name?: string;
  user_image?: string;
  gender?: string;
  account_type?: string;
  stories: Story[];
  unviewed_count: number;
}

export function StoriesRow() {
  const navigate = useNavigate();
  const location = useLocation();
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [friendsStories, setFriendsStories] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  const isValidRemoteImage = (url?: string) => {
    if (!url) return false;
    const normalized = url.trim().toLowerCase();
    if (!normalized || normalized === "null" || normalized === "undefined") return false;
    if (normalized.includes("placeholder") || normalized.includes("default")) return false;
    if (normalized.includes("ui-avatars.com")) return false;
    return true;
  };

  const getAuthProfileImage = () => {
    // Prefer server-side profile image if available, otherwise Firebase photoURL, then gender/default
    const serverImage = currentUserProfile?.image_name;
    if (isValidRemoteImage(serverImage)) return serverImage as string;
    const photoUrl = auth.currentUser?.photoURL || undefined;
    if (isValidRemoteImage(photoUrl)) return photoUrl;
    if (currentUserProfile?.gender === "male") return maleIcon;
    if (currentUserProfile?.gender === "female") return femaleIcon;
    return profileIcon;
  };

  const getUserProfileImage = (user?: StoryUser) => {
    if (isValidRemoteImage(user?.user_image)) {
      return user?.user_image as string;
    }
    if (user?.gender === "male") return maleIcon;
    if (user?.gender === "female") return femaleIcon;
    return profileIcon;
  };

  const getStoryPoster = (user?: StoryUser) => {
    const userImage = getUserProfileImage(user);
    if (userImage) return userImage;
    return profileIcon;
  };

  const hasValue = (value?: string) => {
    const text = (value || "").trim();
    if (!text) return false;
    const lowered = text.toLowerCase();
    return lowered !== "unknown" && lowered !== "null" && lowered !== "undefined";
  };

  const isTemporaryUsername = (value?: string) => {
    const normalized = (value || "").trim().toLowerCase();
    return normalized.startsWith("temp_");
  };

  const getStoryDisplayName = (user?: StoryUser) => {
    if (hasValue(user?.username) && !isTemporaryUsername(user?.username)) return String(user?.username).trim();
    if (hasValue(user?.public_id)) return String(user?.public_id).trim().toUpperCase();
    if (hasValue(user?.username)) return String(user?.username).trim();
    if (hasValue(user?.full_name)) return String(user?.full_name).trim();
    return "User";
  };

  // Fetch stories feed (includes both my stories and friends' stories)
  useEffect(() => {
    // Load current user's profile for consistent avatar fallback across pages
    const fetchCurrentUserProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/profile/user/${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCurrentUserProfile(data || null);
      } catch (err) {
        // ignore
      }
    };
    fetchCurrentUserProfile();
    const fetchStories = async () => {
      try {
        const user = auth.currentUser;
        
        if (!user) {
          console.warn("No authenticated user found");
          setLoading(false);
          return;
        }

        const token = await user.getIdToken();
        
        // Fetch my stories separately for better control
        const myStoriesResponse = await fetch("http://127.0.0.1:8000/stories/my-stories", {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        if (myStoriesResponse.ok) {
          const myData = await myStoriesResponse.json();
          if (Array.isArray(myData)) {
            setMyStories(myData);
            console.log("✅ My stories loaded:", myData.length);
          }
        }

        // Fetch friends' stories feed (backend now includes own stories too)
        const feedResponse = await fetch("http://127.0.0.1:8000/stories/feed", {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        if (feedResponse.ok) {
          const feedData = await feedResponse.json();
          console.log("✅ Feed data received:", feedData);
          if (Array.isArray(feedData)) {
            // Filter out my own stories from feed (they're already in myStories)
            const friendsOnly = feedData.filter((storyUser: StoryUser) => storyUser.user_id !== user.uid);
            setFriendsStories(friendsOnly);
            console.log("✅ Friends stories:", friendsOnly.length);
          }
        } else {
          console.error("❌ Feed fetch failed:", feedResponse.status);
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [location]);

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm("Delete this story?")) return;

    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Not authenticated");
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(`http://127.0.0.1:8000/stories/delete/${storyId}`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Delete error:", errorData);
        alert("Failed to delete story");
        return;
      }

      setMyStories(myStories.filter((s) => s.story_id !== storyId));
      alert("Story deleted ✓");
    } catch (error) {
      console.error("Error deleting story:", error);
      alert("Failed to delete story");
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide md:gap-6 -mx-4 px-4 lg:mx-0 lg:px-0 py-4">
      {/* ✨ ADD STORY BUTTON - Orange gradient like Instagram (avatar + plus badge) */}
      <div className="flex flex-col items-center gap-3 flex-shrink-0 group">
        <button
          onClick={() => navigate("/story/upload")}
          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[3px] transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 50%, #ffa630 100%)',
          }}
        >
          {/* inner white ring with avatar */}
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
            <img
              src={getAuthProfileImage()}
              alt="Your avatar"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = profileIcon;
              }}
            />
          </div>

          {/* Instagram-style small plus badge at bottom-right (responsive) */}
          <div className="absolute -right-1 -bottom-1 sm:-right-2 sm:-bottom-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-sm border-2 border-white z-20"
            style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}>
            <Plus size={10} className="text-white" />
          </div>
        </button>
        <p className="text-xs sm:text-sm font-semibold text-center text-foreground truncate w-20 group-hover:text-orange-600 transition-colors">
          Add Story
        </p>
      </div>

      {/* 🎬 MY STORY - with purple gradient ring (unviewed style) */}
      {myStories.length > 0 && (
        <div className="flex flex-col items-center gap-3 flex-shrink-0 group">
          <div
            onClick={() => navigate(`/story/view/${myStories[0].story_id}`)}
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 p-[3px] group"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
            }}
          >
            {/* Story content */}
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-full overflow-hidden border-[3px] border-background/90 relative">
              <img
                src={myStories[0].media_url}
                alt="Your story"
                className="w-full h-full object-cover"
              />
              {/* Subtle overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
            </div>

            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
              }}
            ></div>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-center text-foreground truncate w-24 group-hover:text-primary transition-colors">
            Your Story
          </p>
        </div>
      )}

      {/* 👥 FRIENDS' STORIES - Circular with gradient rings for unviewed */}
      {friendsStories.map((userGroup) => {
        const firstStory = userGroup.stories[0];
        const isUnviewed = userGroup.unviewed_count > 0;
        
        return (
          <div
            key={userGroup.user_id}
            className="flex flex-col items-center gap-3 flex-shrink-0 group"
          >
            <div
              onClick={() => navigate(`/story/view/${firstStory.story_id}`)}
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 p-[3px]"
              style={{
                background: isUnviewed
                  ? 'linear-gradient(135deg, #ec4899 0%, #f97316 50%, #eab308 100%)'
                  : 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%)',
                boxShadow: isUnviewed 
                  ? '0 6px 20px rgba(236, 72, 153, 0.45)'
                  : '0 3px 10px rgba(107, 114, 128, 0.25)',
              }}
            >
              {/* Story content */}
              <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-full overflow-hidden border-[3px] border-background/90 relative">
                {/* Story Thumbnail */}
                {firstStory.media_type === "image" ? (
                  <img
                    src={firstStory.media_url}
                    alt={`${getStoryDisplayName(userGroup)}'s story`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={firstStory.media_url}
                    poster={getStoryPoster(userGroup)}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    controls={false}
                    onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                )}
                
                {/* Subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
              </div>

              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                }}
              ></div>
            </div>

            {/* Username Label */}
            <p className="text-xs sm:text-sm font-semibold text-center text-foreground truncate w-24 group-hover:text-primary transition-colors duration-200">
              {getStoryDisplayName(userGroup)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
