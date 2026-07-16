import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import heroBanner from "@/assets/hero-banner2.png";

const API_BASE = "https://api.kirnagram.com";

type HomeAd = {
  _id: string;
  publisher_id: string;
  ad_name: string;
  business_name?: string;
  description?: string;
  photo_preview_url?: string;
  video_preview_url?: string;
  website_url?: string;
};

export function HeroBanner() {
  const navigate = useNavigate();
  const [ads, setAds] = useState<HomeAd[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mediaPhase, setMediaPhase] = useState<"image" | "video">("image");

  useEffect(() => {
    const loadHomeAds = async () => {
      try {
        const res = await fetch(`${API_BASE}/ads/public/placement-ads?placement=home_banner&limit=20`);
        if (!res.ok) {
          console.warn("Failed to load ads:", res.status);
          return;
        }
        const data = await res.json();
        const items: HomeAd[] = Array.isArray(data?.items) ? data.items : [];
        
        if (items.length > 0) {
          setAds(items);
          if (items.length > 1) {
            setCurrentIndex(Math.floor(Math.random() * items.length));
          } else {
            setCurrentIndex(0);
          }
        } else {
          console.warn("No ads available from API");
          setAds([]);
        }
      } catch (error) {
        console.warn("Error loading ads:", error);
        setAds([]);
      }
    };

    loadHomeAds();
    
    // Retry loading ads after 10 seconds if none were loaded initially
    const retryTimer = setTimeout(() => {
      loadHomeAds();
    }, 10000);

    return () => clearTimeout(retryTimer);
  }, []);

  const currentAd = useMemo(() => {
    if (ads.length === 0) return null;
    return ads[currentIndex % ads.length] || null;
  }, [ads, currentIndex]);

  useEffect(() => {
    setMediaPhase("image");
  }, [currentAd?._id]);

  useEffect(() => {
    if (!currentAd || ads.length === 0) return;

    const hasImage = Boolean(currentAd?.photo_preview_url);
    const hasVideo = Boolean(currentAd?.video_preview_url);

    let timerId: number;

    if (hasImage && hasVideo && mediaPhase === "image") {
      timerId = window.setTimeout(() => {
        setMediaPhase("video");
      }, 2000);
    } else {
      const nextDelay = hasImage && hasVideo ? 4000 : 6000;
      timerId = window.setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
      }, nextDelay);
    }

    return () => window.clearTimeout(timerId);
  }, [ads.length, currentAd, mediaPhase]);

  useEffect(() => {
    if (!currentAd?._id) return;
    fetch(`${API_BASE}/ads/campaigns/${currentAd._id}/track-view`, { method: "POST" }).catch(() => undefined);
  }, [currentAd?._id]);

  const handleViewDetails = () => {
    if (!currentAd) {
      // If no ad is currently running, encourage publisher signup workflow
      navigate("/become-publisher");
      return;
    }

    // For running ads, go to the business profile page
    navigate(`/publisher/business-profile/${currentAd.publisher_id}`);
  };

  const showVideo = Boolean(currentAd?.video_preview_url) && (!currentAd?.photo_preview_url || mediaPhase === "video");
  const bgImage = currentAd?.photo_preview_url || heroBanner;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleViewDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleViewDetails();
        }
      }}
      className="relative block w-full overflow-hidden rounded-2xl border border-border/50 bg-black text-left"
    >
      <div className="absolute inset-0">
        {showVideo ? (
          <video
            key={`${currentAd?._id}-video`}
            src={currentAd?.video_preview_url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <img
            src={bgImage}
            alt={currentAd?.ad_name || "Cyber Renaissance"}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="relative h-[360px] md:h-[380px] lg:h-[400px] p-5 md:p-7 lg:p-8 flex items-end">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/20 text-secondary rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-secondary rounded-full animate-pulse-soft" />
            {currentAd ? "SPONSORED AD" : "KIRNAGRAM ADS"}
          </span>

          <h2 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold mb-3 text-gray-900 dark:text-white" style={{ textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}>
            {currentAd ? (
              <>
                {currentAd.business_name ? <span className="gradient-text">{currentAd.business_name}</span> : "Featured Brand"}
                <br />
                {currentAd.ad_name}
              </>
            ) : (
              <>
                Discover <span className="gradient-text">Kirnagram</span>
                <br />
                Ads & Promotions
              </>
            )}
          </h2>

          <p className="text-gray-900 dark:text-white/95 text-sm md:text-base mb-6 max-w-lg" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            {currentAd?.description || "Explore amazing brands, products, and services from official Kirnagram partners."}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleViewDetails();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-full font-medium text-sm hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95"
            >
              View Details
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {ads.length > 0 && currentAd && (
            <p className="text-xs text-gray-900 dark:text-white/85 mt-3" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              {currentAd.photo_preview_url && currentAd.video_preview_url
                ? mediaPhase === "image"
                  ? "Preview image showing for 2 seconds"
                  : "Preview video showing for 4 seconds"
                : "Auto rotating sponsored ads"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
