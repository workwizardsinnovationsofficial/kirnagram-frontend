import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { auth } from "@/firebase";
import { Download, ArrowLeft } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const REMIX_API_BASE = import.meta.env.VITE_REMIX_API_BASE || "http://127.0.0.1:8001";

// ⏱️ REQUEST TIMEOUT (30 seconds for main requests, 15 for optional)
const REMIX_REQUEST_TIMEOUT = 30000; // 30 seconds for critical remix fetch
const OPTIONAL_REQUEST_TIMEOUT = 15000; // 15 seconds for optional profile fetch

type RemixDetail = {
  id: string;
  image_url?: string;
  source_image?: string;
  prompt_id?: string;
  ratio?: string;
  model?: string;
  quality?: string;
  credits_used?: number;
  payout_per_remix?: number;
  review_rating?: string;
  review_comment?: string;
  review_improvement?: string;
  review_submitted_at?: string;
  created_at?: string;
  status?: "completed" | "processing";
  is_owner?: boolean;
  owner_id?: string;
};

type UserProfile = {
  firebase_uid?: string;
  name?: string;
  avatar?: string;
  username?: string;
};

const RemixDetails = () => {
  const { remixId } = useParams();
  const navigate = useNavigate();

  // Loading and error states
  const [remixLoading, setRemixLoading] = useState(true);
  const [remixError, setRemixError] = useState<string | null>(null);

  // Remix and owner data
  const [remix, setRemix] = useState<RemixDetail | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [downloading, setDownloading] = useState(false);

  /**
   * ✅ IMPROVED: Fetch with fresh token + timeout + abort support
   * @param url - API endpoint
   * @param timeoutMs - Request timeout in milliseconds
   * @param init - Additional fetch options (including AbortSignal)
   * @returns Response or throws an error
   */
  const fetchWithFreshToken = async (
    url: string,
    timeoutMs: number = 30000,
    init?: RequestInit
  ) => {
    const user = auth.currentUser;
    if (!user) {
      console.error("❌ [fetchWithFreshToken] User not logged in");
      throw new Error("Not logged in");
    }

    // ✅ Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`⏱️ [fetchWithFreshToken] Request timeout (${timeoutMs}ms): ${url}`);
      controller.abort();
    }, timeoutMs);

    try {
      console.log(`📤 [fetchWithFreshToken] Fetching (timeout: ${timeoutMs}ms): ${url}`);

      let token: string;
      try {
        token = await user.getIdToken();
      } catch (err) {
        console.error("❌ [fetchWithFreshToken] Failed to get ID token", err);
        throw new Error("Failed to get authentication token");
      }

      let response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`📥 [fetchWithFreshToken] Response status: ${response.status} for ${url}`);

      // ✅ Token refresh on 401
      if (response.status === 401) {
        console.warn(`⚠️ [fetchWithFreshToken] Got 401, attempting token refresh for ${url}`);
        try {
          token = await user.getIdToken(true); // Force refresh
        } catch (err) {
          console.error("❌ [fetchWithFreshToken] Failed to refresh token", err);
          throw new Error("Token refresh failed");
        }

        response = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            ...(init?.headers || {}),
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        console.log(`📥 [fetchWithFreshToken] Retry response status: ${response.status} for ${url}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  /**
   * ✅ MAIN: Load remix details - CRITICAL, blocks initial page load
   * Must complete before page renders, handles all error cases
   */
  useEffect(() => {
    const loadRemix = async () => {
      if (!remixId) {
        console.error("❌ [loadRemix] No remix ID provided");
        setRemixError("Invalid remix ID");
        setRemixLoading(false);
        return;
      }

      console.log(`🎬 [loadRemix] Starting remix load for ID: ${remixId}`);

      try {
        const remixUrl = `${REMIX_API_BASE}/remix/${remixId}`;
        console.log(`📡 [loadRemix] Making request to: ${remixUrl}`);

        const res = await fetchWithFreshToken(remixUrl, REMIX_REQUEST_TIMEOUT);

        // ✅ Handle specific HTTP status codes
        if (res.status === 403) {
          const errorMsg = "Private Remix - You don't have permission to view this remix";
          console.warn(`⚠️ [loadRemix] Access denied (403): ${errorMsg}`);
          throw new Error(errorMsg);
        }

        if (res.status === 404) {
          const errorMsg = "Remix not found";
          console.warn(`⚠️ [loadRemix] Not found (404): ${errorMsg}`);
          throw new Error(errorMsg);
        }

        if (res.status === 500) {
          const errorMsg = "Server error, please try again later";
          console.error(`🔥 [loadRemix] Server error (500): ${errorMsg}`);
          throw new Error(errorMsg);
        }

        if (!res.ok) {
          const errorMsg = `HTTP ${res.status}: Failed to load remix`;
          console.error(`❌ [loadRemix] Response not ok: ${errorMsg}`);
          throw new Error(errorMsg);
        }

        let data: RemixDetail;
        try {
          data = await res.json();
          console.log(`✅ [loadRemix] Successfully parsed remix data:`, data);
        } catch (parseErr) {
          console.error("❌ [loadRemix] Failed to parse response JSON", parseErr);
          throw new Error("Invalid server response format");
        }

        setRemix(data);
        setRemixError(null);
        console.log(`✅ [loadRemix] Remix data saved to state`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Failed to load remix";
        console.error(`❌ [loadRemix] Error occurred: ${errorMsg}`, error);

        setRemixError(errorMsg);
        toast({
          title: "Failed to load remix",
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        // ✅ CRITICAL: Always set loading to false, no matter what
        console.log(`🏁 [loadRemix] Setting remixLoading to false`);
        setRemixLoading(false);
      }
    };

    loadRemix();
  }, [remixId]);

  /**
   * ✅ OPTIONAL: Load owner profile separately
   * Does NOT block page rendering, handles failures gracefully
   */
  useEffect(() => {
    if (!remix?.owner_id) {
      console.log("ℹ️ [loadOwnerProfile] No owner_id available, skipping owner profile fetch");
      return;
    }

    const loadOwnerProfile = async () => {
      const ownerId = remix.owner_id;
      console.log(`🎬 [loadOwnerProfile] Starting owner profile load for ID: ${ownerId}`);

      try {
        const ownerUrl = `${API_BASE}/profile/user/${ownerId}`;
        console.log(`📡 [loadOwnerProfile] Making request to: ${ownerUrl}`);

        const res = await fetchWithFreshToken(ownerUrl, OPTIONAL_REQUEST_TIMEOUT);

        // ✅ If owner profile fetch fails, just continue without owner info
        if (!res.ok) {
          console.warn(
            `⚠️ [loadOwnerProfile] Failed to load owner profile (${res.status}). Continuing without owner info.`
          );
          setOwner(null);
          // Don't throw - let page render with null owner
          return;
        }

        let data: UserProfile;
        try {
          data = await res.json();
          console.log(`✅ [loadOwnerProfile] Successfully parsed owner data:`, data);
        } catch (parseErr) {
          console.warn("⚠️ [loadOwnerProfile] Failed to parse owner response JSON", parseErr);
          setOwner(null);
          return;
        }

        setOwner(data);
        console.log(`✅ [loadOwnerProfile] Owner data saved to state`);
      } catch (error) {
        // ✅ Owner profile errors should NOT block the page
        const errorMsg = error instanceof Error ? error.message : "Owner profile fetch failed";
        console.warn(`⚠️ [loadOwnerProfile] Error (non-blocking): ${errorMsg}`, error);
        setOwner(null);
        // No toast notification - this is optional and shouldn't disturb the user
      }
    };

    loadOwnerProfile();
  }, [remix?.owner_id]);

  /**
   * ✅ DOWNLOAD: Handle remix download with proper error handling
   */
  const handleDownload = async () => {
    if (!remixId) {
      console.error("❌ [handleDownload] No remix ID available");
      toast({
        title: "Error",
        description: "Invalid remix ID",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`🎬 [handleDownload] Starting download for remix: ${remixId}`);

      setDownloading(true);
      const user = auth.currentUser;

      if (!user) {
        console.error("❌ [handleDownload] User not logged in");
        toast({
          title: "Error",
          description: "Please login to download",
          variant: "destructive",
        });
        return;
      }

      let token: string;
      try {
        token = await user.getIdToken();
      } catch (err) {
        console.error("❌ [handleDownload] Failed to get ID token", err);
        throw new Error("Failed to get authentication token");
      }

      const downloadUrl = `${API_BASE}/remix/download/${remixId}`;
      console.log(`📡 [handleDownload] Making download request to: ${downloadUrl}`);

      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(`📥 [handleDownload] Response status: ${response.status}`);

      if (!response.ok) {
        const errorMsg = `Download failed: HTTP ${response.status}`;
        console.error(`❌ [handleDownload] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      console.log(`✅ [handleDownload] Received blob (${blob.size} bytes)`);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kirnagram-remix-${remixId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ [handleDownload] Download completed successfully`);
      toast({
        title: "Success",
        description: "Remix downloaded",
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Could not download remix";
      console.error(`❌ [handleDownload] Error: ${errorMsg}`, error);

      toast({
        title: "Download failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Show loading state
  if (remixLoading) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-4xl mx-auto py-16 text-center text-muted-foreground">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin h-10 w-10 border-4 border-t-transparent border-primary rounded-full mb-4"></div>
            <p>Loading remix...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show error state
  if (remixError) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-4xl mx-auto py-16">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold text-foreground mb-2">Unable to load remix</p>
            <p className="text-muted-foreground mb-6">{remixError}</p>
            <Button onClick={() => navigate(-1)}>Go back</Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Remix failed to load but no error (shouldn't happen with current logic)
  if (!remix) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-4xl mx-auto py-16">
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold text-foreground">Remix not found</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Go back
            </Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const formatDate = (date?: string) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const ownerName = owner?.name || owner?.username || "Unknown User";
  const statusLabel = remix.status === "completed" ? "Completed" : "Processing";
  const statusColor = remix.status === "completed" ? "text-emerald-500" : "text-blue-500";

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto pb-12 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Image section */}
          <div className="lg:col-span-2">
            <Card className="glass-card border border-border/60 p-5 overflow-hidden">
              <div className="w-full flex items-center justify-center min-h-[400px] bg-gradient-to-br from-muted/60 to-background rounded-xl border border-border/60 shadow-lg overflow-hidden">
                {remix.image_url ? (
                  <img
                    src={remix.image_url}
                    alt="Remix"
                    className="max-w-full max-h-[600px] object-contain rounded-xl shadow-md"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground">
                    <span className="text-4xl mb-2">🖼️</span>
                    <span>No image available</span>
                  </div>
                )}
              </div>

              {remix.source_image && (
                <div className="mt-4 pt-4 border-t border-border/60">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Source Image
                  </p>
                  <img
                    src={remix.source_image}
                    alt="Source"
                    className="w-full max-h-[200px] object-contain rounded-lg border border-border/60"
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Details section */}
          <div className="space-y-4">
            {/* Status */}
            <Card className="glass-card border border-border/60 p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Status
                  </p>
                  <p className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</p>
                </div>

                {remix.status === "processing" && (
                  <div className="flex items-center gap-2 text-sm text-blue-500">
                    <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-current rounded-full"></div>
                    <span>Generating...</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Creator info */}
            <Card className="glass-card border border-border/60 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Creator
                </p>
                <p className="text-sm font-semibold text-foreground">{ownerName}</p>
                {remix.is_owner && (
                  <p className="text-xs text-muted-foreground mt-1">This is your remix</p>
                )}
              </div>
            </Card>

            {/* Remix info */}
            <Card className="glass-card border border-border/60 p-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Aspect Ratio
                </p>
                <p className="text-sm font-semibold text-foreground">{remix.ratio || "N/A"}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Model</p>
                <p className="text-sm font-semibold text-foreground">{remix.model || "N/A"}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quality</p>
                <p className="text-sm font-semibold text-foreground">{remix.quality || "N/A"}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Credits Used
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {remix.credits_used || "N/A"}
                </p>
              </div>

              {remix.created_at && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(remix.created_at)}
                  </p>
                </div>
              )}
            </Card>

            {/* Review info (if available) */}
            {remix.review_rating && (
              <Card className="glass-card border border-border/60 p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        remix.review_rating === "good"
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-rose-500/15 text-rose-500"
                      }`}
                    >
                      {remix.review_rating === "good" ? "Good" : "Bad"} Review
                    </span>
                  </div>
                  {remix.review_comment && (
                    <p className="text-xs text-muted-foreground">{remix.review_comment}</p>
                  )}
                  {remix.review_improvement && (
                    <p className="text-xs text-muted-foreground">
                      Improvement: {remix.review_improvement}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Download button */}
            <Button
              onClick={handleDownload}
              disabled={downloading || !remix.image_url}
              className="w-full"
            >
              {downloading ? (
                <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-current rounded-full mr-2 inline-block"></span>
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {downloading ? "Downloading..." : "Download"}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default RemixDetails;
