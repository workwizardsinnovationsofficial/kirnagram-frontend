import { useState, useRef } from "react";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import profileIcon from "@/assets/profileicon.png";
import aiCreatorIcon from "@/assets/ai-creator-icon-2.png";
import { MoreHorizontal, Heart, MessageCircle, Eye, TrendingUp, Sparkles, Share2, Plus } from "lucide-react";
import { cn, removeHashtags } from "@/lib/utils";
import { useEffect } from "react";
import { useVideoSound } from "@/context/VideoSoundContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
interface FeedPostProps {
  author: {
    name: string;
    username?: string;
    public_id?: string;
    avatar: string;
    isPro?: boolean;
    earnings?: string;
    isVerified?: boolean;
  };
  image?: string;
  mediaType?: "image" | "video" | "text";
  ratio?: string;
  tags?: string[];
  badge?: string;
  caption?: string;
  likes?: number;
  comments?: number;
  views?: number;
  isLiked?: boolean;
  showRemix?: boolean;
  onRemix?: () => void;
  onAuthorClick?: () => void;
  onPostClick?: () => void;
  onLike?: () => void;
  onOpenLikes?: () => void;
  onOpenComments?: () => void;
  onOpenViews?: () => void;
  onShare?: () => void;
  onAddToStory?: () => void;
  showFollowButton?: boolean;
  followState?: "none" | "requested" | "following";
  followLoading?: boolean;
  onToggleFollow?: () => void;
  sampleImages?: string[];
}

export function FeedPost({
  author,
  image,
  mediaType,
  ratio,
  tags,
  badge,
  caption,
  likes = 0,
  comments = 0,
  views = 0,
  isLiked = false,
  showRemix = false,
  onRemix,
  onAuthorClick,
  onPostClick,
  onLike,
  onOpenLikes,
  onOpenComments,
  onOpenViews,
  onShare,
  onAddToStory,
  showFollowButton = false,
  followState = "none",
  followLoading = false,
  onToggleFollow,
  sampleImages,
}: FeedPostProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const { isMuted, toggleMute } = useVideoSound();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Format large numbers for likes/views
  const formatCount = (value: number) => {
    if (value < 1000) return `${value}`;
    if (value < 1000000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  };

useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!video) return;

      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        // Pause all other videos
        document.querySelectorAll("video").forEach((v) => {
          if (v !== video) {
            v.pause();
          }
        });

        // Restart from beginning (Reels behavior)
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    },
    { threshold: 0.6 }
  );

  observer.observe(video);

  return () => observer.disconnect();
}, []);

// Helper to get user avatar for comments
function getUserAvatar(user?: { image_name?: string; user_image?: string; gender?: string }) {
  const url = user?.image_name || user?.user_image;
  if (url && typeof url === "string" && url.startsWith("http") && !url.includes("default") && !url.includes("placeholder") && !url.startsWith("blob:")) {
    return url;
  }
  if (user?.gender === "male") return maleIcon;
  if (user?.gender === "female") return femaleIcon;
  return profileIcon;
}

  const displayUsername = author.username
    ? author.username.startsWith("@")
      ? author.username
      : `@${author.username}`
    : author.public_id
      ? (author.public_id.startsWith("@") ? author.public_id : `@${author.public_id}`)
      : "@user";
  const displayCaption = removeHashtags(caption);
  const normalizedSampleImages =
    Array.isArray(sampleImages) && sampleImages.length > 0
      ? sampleImages.filter((url) => typeof url === "string" && url.trim().length > 0)
      : [];
  const carouselImages = normalizedSampleImages.length > 0 ? normalizedSampleImages : [image];
  const useImageCarousel = mediaType !== "video" && carouselImages.length > 1;

  const followLabel =
    followState === "following"
      ? "Following"
      : followState === "requested"
        ? "Requested"
        : "Follow";


  // Default Add to Story handler
  async function handleAddToStory() {
    try {
      // Show loading (optional: replace with toast/modal)
      // Prepare form data
      const formData = new FormData();
      formData.append("media_type", mediaType || "image");
      formData.append("duration", mediaType === "video" ? "15" : "7");
      formData.append("file", await fetch(image).then(r => r.blob()), "story-media" + (mediaType === "video" ? ".mp4" : ".jpg"));
      // TODO: Add auth token logic here
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to add a story.");
        return;
      }
      const res = await fetch("/api/stories/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to add story");
      }
      alert("Story added!");
    } catch (e: any) {
      alert(e.message || "Failed to add story");
    }
  }

  const isTextOnly = mediaType === "text";

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[600px] transition-all duration-300 hover:scale-[1.01]">
        <div className="rounded-2xl overflow-hidden shadow-lg border bg-white border-zinc-200 text-zinc-800 dark:bg-gradient-to-b dark:from-zinc-900 dark:to-black dark:border-zinc-800 dark:text-gray-900 dark:text-white">
        {/* Author Header */}
        <div className="flex items-center justify-between p-4">
          <button className="flex items-center gap-3 text-left min-w-0" onClick={onAuthorClick}>
            <div className="story-ring">
              <img
                src={author.avatar}
                alt={author.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-[13px] sm:text-sm text-zinc-800 dark:text-gray-900 dark:text-white truncate max-w-[180px] sm:max-w-[240px]">
                  {author.name}
                </span>
                {author.isVerified && (
                  <img
                    src={aiCreatorIcon}
                    alt="AI Creator"
                    className="w-4 h-4 rounded-full"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-muted-foreground min-w-0">
                <span className="truncate">{displayUsername}</span>
                {author.isPro && <span className="badge-pro text-[10px]">PRO</span>}
                {author.earnings && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    {author.earnings}
                  </span>
                )}
              </div>
            </div>
          </button>
          <div className="relative flex items-center gap-2">
            {showFollowButton && (
              <button
                type="button"
                onClick={onToggleFollow}
                disabled={followLoading}
                className={cn(
                  "h-8 min-w-[72px] px-3 rounded-md text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                  followState === "following" || followState === "requested"
                    ? "border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 bg-transparent"
                    : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-gray-900 dark:text-white dark:hover:bg-zinc-700"
                )}
              >
                {followLoading ? "..." : followLabel}
              </button>
            )}
            <button
              className="p-2 hover:bg-zinc-100 dark:hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Post options"
            >
              <MoreHorizontal className="w-5 h-5 text-zinc-500 dark:text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-44 rounded-xl border border-zinc-200 dark:border-border bg-white dark:bg-background shadow-lg overflow-hidden z-10">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    setMenuOpen(false);
                    onShare?.();
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                {mediaType !== "text" && (image || mediaType === "image" || mediaType === "video") && (
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-muted flex items-center gap-2"
                    onClick={async () => {
                      setMenuOpen(false);
                      if (onAddToStory) {
                        onAddToStory();
                      } else {
                        await handleAddToStory();
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Add to Story
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {!isTextOnly && displayCaption && (
          <div className="px-4 pb-3 -mt-1">
            <p className={cn("text-sm text-zinc-700 dark:text-muted-foreground", !captionExpanded && "line-clamp-2")}> 
              {displayCaption}
            </p>
            {displayCaption.length > 80 && (
              <button
                className="mt-1 text-xs text-orange-600 hover:underline dark:text-primary"
                onClick={() => setCaptionExpanded((prev) => !prev)}
              >
                {captionExpanded ? "less" : "more"}
              </button>
            )}
          </div>
        )}

        {isTextOnly ? (
          <div className="rounded-b-2xl border-t border-border bg-slate-50 dark:bg-gray-50 dark:bg-zinc-900 p-4 text-left">
            <p className="text-base text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
              {caption || "Text post"}
            </p>
          </div>
        ) : mediaType === "video" ? (
  <div className="relative w-full">
    <video
      ref={videoRef}
      src={image}
      className="w-full object-cover"
      style={{ aspectRatio: ratio?.replace(":", "/") || "9 / 16" }}
      loop
      playsInline
      muted={isMuted}
      controls={false}
      preload="metadata"
    />
    {/* Mute / Unmute Button */}
    <button
      onClick={toggleMute}
      className="
        absolute bottom-5 right-5
        bg-black/60 backdrop-blur-md
        text-gray-900 dark:text-white
        rounded-full
        p-3
        transition
        duration-200
        active:scale-90
      "
    >
      {isMuted ? "🔇" : "🔊"}
    </button>
  </div>
) : (
  useImageCarousel ? (
    <div className="relative w-full" style={{ aspectRatio: ratio?.replace(":", "/") || "4 / 5" }}>
      <Carousel className="w-full h-full" opts={{ loop: true }}>
        <CarouselContent className="h-full">
          {carouselImages.map((img, index) => (
            <CarouselItem key={`${img}-${index}`} className="h-full">
              <button className="w-full h-full" onClick={onPostClick}>
                <img
                  src={img}
                  alt={`Post sample ${index + 1}`}
                  className="w-full h-full object-cover"
                  style={{ aspectRatio: ratio?.replace(":", "/") || "4 / 5" }}
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/35 px-2 py-1 rounded-full">
        {carouselImages.map((_, index) => (
          <span key={index} className="w-1.5 h-1.5 rounded-full bg-white/75" />
        ))}
      </div>
    </div>
  ) : (
    <button className="relative w-full" onClick={onPostClick}>
      <img
        src={carouselImages[0] || image}
        alt="Post"
        className="w-full object-cover"
        style={{ aspectRatio: ratio?.replace(":", "/") || "4 / 5" }}
      />
    </button>
  )
)}

        {/* Remix This Style Button */}
        {showRemix && (
          <div className="px-4 py-3">
            <button
              onClick={onRemix}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-secondary to-accent text-secondary-foreground rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-secondary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-5 h-5" />
              Remix This Style
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pt-3 pb-4 flex items-center gap-6 text-sm">
          <span className={cn(
            "flex items-center gap-1.5 group",
            isLiked ? "text-red-500" : "text-zinc-700 dark:text-foreground"
          )}>
            <button
              onClick={onLike}
              className="focus:outline-none"
              aria-label="Like post"
              type="button"
            >
              <Heart className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button
              onClick={onOpenLikes}
              className="focus:outline-none text-inherit"
              aria-label="Show likes"
              type="button"
              style={{ minWidth: 24, textDecoration: 'none' }}
            >
              {formatCount(likes)}
            </button>
          </span>
          <button
            className="flex items-center gap-1.5 min-w-[56px] text-zinc-700 dark:text-foreground"
            onClick={onOpenComments}
          >
            <MessageCircle className="w-5 h-5" />
            <span>{comments}</span>
          </button>
          <button
            className="flex items-center gap-1.5 min-w-[56px] text-zinc-700 dark:text-foreground"
            onClick={onOpenViews}
            type="button"
            aria-label="Viewers"
            style={{ textDecoration: 'none' }}
          >
            <Eye className="w-5 h-5" />
            <span>{formatCount(views)}</span>
          </button>
        </div>
      </div>
        </div>
    </div>
  );
}
export default FeedPost;
