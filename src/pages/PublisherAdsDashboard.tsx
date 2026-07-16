import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { publisherApi } from "@/lib/publisherApi";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Campaign = {
  _id: string;
  publisher_id: string;
  ad_name: string;
  business_name?: string;
  description?: string;
  logo_url?: string;
  photo_preview_url?: string;
  video_preview_url?: string;
  video_duration_seconds?: number;
  website_url?: string;
  target_audience: string;
  target_region: string[];
  budget_mode: "custom" | "package";
  ad_type?: "standard" | "full";
  custom_budget?: number;
  daily_price?: number;
  package_name?: string;
  package_duration_days?: number;
  package_total_budget?: number;
  started_at?: string;
  ends_at?: string;
  days_left: number;
  status: string;
  metrics: { views: number; detail_clicks: number };
};

const packagePresets = [
  { key: "standard-monthly", name: "Standard Monthly", days: 30, total: 1485 },
  { key: "standard-quarterly", name: "Standard Quarterly", days: 90, total: 3960 },
  { key: "standard-yearly", name: "Standard Yearly", days: 365, total: 14053 },
  { key: "full-monthly", name: "Full Video Monthly", days: 30, total: 2025 },
  { key: "full-quarterly", name: "Full Video Quarterly", days: 90, total: 5400 },
  { key: "full-yearly", name: "Full Video Yearly", days: 365, total: 19163 },
];

const PublisherAdsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [adName, setAdName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState("General Public");
  const [targetRegion, setTargetRegion] = useState("Urban");
  const [budgetMode, setBudgetMode] = useState<"custom" | "package">("custom");
  const [adType, setAdType] = useState<"standard" | "full">("standard");
  const [customBudget, setCustomBudget] = useState("2000");
  const [packageKey, setPackageKey] = useState(packagePresets[0].key);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const customDailyPrice = adType === "standard" ? 55 : 75;
  const calculatedDays = Math.max(1, Math.floor((Number(customBudget) || 0) / customDailyPrice));
  const selectedPackage = packagePresets.find((p) => p.key === packageKey) || packagePresets[0];
  const totalAmount = budgetMode === "custom" ? Math.ceil(Number(customBudget) || 0) : selectedPackage.total;

  const campaigns: Campaign[] = summary?.campaigns || [];

  const chartRows = useMemo(() => campaigns.slice(0, 6), [campaigns]);
  const timelineData = useMemo(() => {
    const base = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      views: 0,
      clicks: 0,
    }));

    campaigns.forEach((campaign, index) => {
      const fallbackHour = index % 24;
      const startedHour = campaign.started_at ? new Date(campaign.started_at).getHours() : fallbackHour;
      const hour = Number.isFinite(startedHour) ? Math.max(0, Math.min(23, startedHour)) : fallbackHour;

      base[hour].views += Number(campaign.metrics?.views || 0);
      base[hour].clicks += Number(campaign.metrics?.detail_clicks || 0);
    });

    return base;
  }, [campaigns]);
  const avgViews = useMemo(() => {
    if (!timelineData.length) return 0;
    const total = timelineData.reduce((acc, point) => acc + point.views, 0);
    return Math.round((total / timelineData.length) * 100) / 100;
  }, [timelineData]);

  const load = async () => {
    try {
      setLoading(true);
      const access = await publisherApi.getAccess();
      if (!access?.is_publisher) {
        navigate("/become-publisher/apply");
        return;
      }

      const [dashboardSummary, businessProfile] = await Promise.all([
        publisherApi.getDashboardSummary(),
        publisherApi.getMyBusinessProfile(),
      ]);
      setSummary(dashboardSummary);
      setProfile(businessProfile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublishAd = async () => {
    try {
      setIsSaving(true);
      if (!adName.trim()) {
        throw new Error("Ad name is required");
      }
      if (!businessName.trim()) {
        throw new Error("Business name is required");
      }
      if (videoDurationSeconds && videoDurationSeconds > 60) {
        throw new Error("Video must be 1 minute or less");
      }

      // Upload files if provided
      setIsUploading(true);
      let finalLogoUrl = logoUrl;
      let finalPhotoUrl = photoPreviewUrl;
      let finalVideoUrl = videoPreviewUrl;

      if (logoFile) {
        const logoResult = await publisherApi.uploadAdLogo(logoFile);
        finalLogoUrl = logoResult.logo_url;
      }
      if (photoFile) {
        const photoResult = await publisherApi.uploadAdPhoto(photoFile);
        finalPhotoUrl = photoResult.photo_url;
      }
      if (videoFile) {
        const videoResult = await publisherApi.uploadAdVideo(videoFile);
        finalVideoUrl = videoResult.video_url;
      }
      setIsUploading(false);

      // Show preview modal
      setShowPreview(true);
      
      // Store uploaded URLs for preview
      setLogoUrl(finalLogoUrl);
      setPhotoPreviewUrl(finalPhotoUrl);
      setVideoPreviewUrl(finalVideoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare ad");
      setIsUploading(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAndPay = async () => {
    try {
      setIsProcessingPayment(true);

      // Create payment order
      const orderResponse = await publisherApi.createPaymentOrder({
        ad_name: adName.trim(),
        business_name: businessName.trim(),
        total_amount: totalAmount * 100, // Convert to paise
        duration_days: budgetMode === "custom" ? calculatedDays : selectedPackage.days,
        budget_mode: budgetMode,
      });

      // Load Razorpay script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        const options = {
          key: orderResponse.razorpay_key,
          order_id: orderResponse.order_id,
          amount: orderResponse.amount,
          currency: orderResponse.currency,
          name: "Kirnagram",
          description: adName,
          handler: async (response: any) => {
            try {
              // Verify payment and create campaign
              await publisherApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              // Create campaign after payment
              if (budgetMode === "custom") {
                await publisherApi.createCampaign({
                  ad_name: adName.trim(),
                  business_name: businessName.trim(),
                  logo_url: logoUrl || undefined,
                  photo_preview_url: photoPreviewUrl || undefined,
                  video_preview_url: videoPreviewUrl || undefined,
                  video_duration_seconds: videoDurationSeconds,
                  description: description.trim() || undefined,
                  website_url: websiteUrl.trim() || undefined,
                  target_audience: targetAudience,
                  target_region: [targetRegion],
                  budget_mode: "custom",
                  ad_type: adType,
                  custom_budget: Number(customBudget),
                });
              } else {
                await publisherApi.createCampaign({
                  ad_name: adName.trim(),
                  business_name: businessName.trim(),
                  logo_url: logoUrl || undefined,
                  photo_preview_url: photoPreviewUrl || undefined,
                  video_preview_url: videoPreviewUrl || undefined,
                  video_duration_seconds: videoDurationSeconds,
                  description: description.trim() || undefined,
                  website_url: websiteUrl.trim() || undefined,
                  target_audience: targetAudience,
                  target_region: [targetRegion],
                  budget_mode: "package",
                  ad_type: adType,
                  package_name: selectedPackage.name,
                  package_duration_days: selectedPackage.days,
                  package_total_budget: selectedPackage.total,
                });
              }

              // Clear form and close modals
              setShowPreview(false);
              setIsModalOpen(false);
              setAdName("");
              setBusinessName("");
              setLogoUrl("");
              setLogoFile(null);
              setPhotoPreviewUrl("");
              setPhotoFile(null);
              setVideoPreviewUrl("");
              setVideoFile(null);
              setVideoDurationSeconds(undefined);
              setDescription("");
              setWebsiteUrl("");
              await load();
              setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to create campaign after payment");
            } finally {
              setIsProcessingPayment(false);
            }
          },
          prefill: {
            name: orderResponse.user_name,
            email: orderResponse.user_email,
            contact: orderResponse.user_phone,
          },
        };
        
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
      document.head.appendChild(script);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process payment");
      setIsProcessingPayment(false);
    }
  };

  const handleDetailsClick = async (campaign: Campaign) => {
    let detailClicks = campaign.metrics.detail_clicks;
    try {
      const tracked = await publisherApi.trackDetailClick(campaign._id);
      detailClicks = tracked?.detail_clicks ?? detailClicks;
    } catch {
      // no-op
    }

    setSelectedCampaign({
      ...campaign,
      metrics: {
        ...campaign.metrics,
        detail_clicks: detailClicks,
      },
    });

    setSummary((prev: any) => {
      if (!prev) return prev;
      const campaignsList: Campaign[] = prev.campaigns || [];
      const nextCampaigns = campaignsList.map((item) =>
        item._id === campaign._id
          ? {
              ...item,
              metrics: {
                ...item.metrics,
                detail_clicks: detailClicks,
              },
            }
          : item
      );

      return {
        ...prev,
        campaigns: nextCampaigns,
        total_detail_clicks: (prev.total_detail_clicks || 0) + (detailClicks > campaign.metrics.detail_clicks ? 1 : 0),
      };
    });
  };

  const handleViewDetails = (campaign: Campaign) => {
    if (campaign.website_url) {
      window.open(campaign.website_url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(`/publisher/business-profile/${campaign.publisher_id}`);
  };

  if (loading) {
    return <MainLayout showRightSidebar={true}><div className="max-w-6xl mx-auto p-6"><p className="text-muted-foreground">Loading ads management...</p></div></MainLayout>;
  }

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Ads Management</h1>
            <p className="text-muted-foreground text-sm">Publisher dashboard with campaign analytics and business profile.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/become-publisher/packages")} className="px-4 py-2 rounded-lg border border-border bg-card text-foreground">Packages</button>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">Publish Ad</button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Total Campaigns</p><p className="text-2xl font-bold">{summary?.total_campaigns || 0}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Active Campaigns</p><p className="text-2xl font-bold">{summary?.active_campaigns || 0}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Ad Views</p><p className="text-2xl font-bold">{summary?.total_views || 0}</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Detail Clicks</p><p className="text-2xl font-bold">{summary?.total_detail_clicks || 0}</p></div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <h2 className="font-semibold mb-3">Campaign Performance Graph</h2>
          {timelineData.some((point) => point.views > 0 || point.clicks > 0) ? (
            <div className="h-[320px] w-full rounded-xl border border-border/60 bg-[#0b1220] p-2 md:p-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 12, right: 8, left: 4, bottom: 8 }}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.45} />
                  <XAxis
                    dataKey="hour"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                    tickMargin={8}
                    interval={2}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} width={34} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", color: "#e2e8f0" }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <ReferenceLine y={avgViews} stroke="#94a3b8" strokeDasharray="5 5" ifOverflow="extendDomain" label={{ value: "Avg", fill: "#94a3b8", position: "right", fontSize: 12 }} />
                  <Area type="monotone" dataKey="views" stroke="#2563eb" fill="url(#viewsGradient)" strokeWidth={2.4} dot={false} activeDot={{ r: 4, fill: "#60a5fa" }} />
                  <Line type="monotone" dataKey="clicks" stroke="#fb923c" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2563eb]" /> Views trend</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#fb923c]" /> Clicks trend</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 md:p-5 overflow-x-auto">
          <h2 className="font-semibold mb-3">All Ads</h2>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Business</th>
                <th className="text-left py-2">Preview</th>
                <th className="text-left py-2">Days Left</th>
                <th className="text-left py-2">Views</th>
                <th className="text-left py-2">Detail Clicks</th>
                <th className="text-left py-2">Insights</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign._id} className="border-b border-border/60">
                  <td className="py-2">{campaign.ad_name}</td>
                  <td className="py-2">{campaign.business_name || "N/A"}</td>
                  <td className="py-2">{campaign.photo_preview_url || campaign.video_preview_url ? <a href={campaign.photo_preview_url || campaign.video_preview_url} target="_blank" rel="noreferrer" className="text-primary underline">Open</a> : <span className="text-muted-foreground">N/A</span>}</td>
                  <td className="py-2">{campaign.days_left}</td>
                  <td className="py-2">{campaign.metrics.views}</td>
                  <td className="py-2">{campaign.metrics.detail_clicks}</td>
                  <td className="py-2">
                    <button onClick={() => handleDetailsClick(campaign)} className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted">Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <h2 className="font-semibold mb-2">Business Profile</h2>
          <p className="text-sm text-muted-foreground">{profile?.business_name || "Business"} {profile?.whatsapp ? `• WhatsApp: ${profile.whatsapp}` : ""}</p>
          <p className="text-sm text-muted-foreground mt-1">{profile?.about || "Add your profile details so users can view business information when website is unavailable."}</p>
          {profile?.publisher_id && (
            <button
              onClick={() => navigate(`/publisher/business-profile/${profile.publisher_id}`)}
              className="mt-3 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm"
            >
              Open Business Page
            </button>
          )}
        </div>
      </div>

      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/45 p-3 md:p-5 flex items-center justify-center overflow-y-auto" onClick={() => setSelectedCampaign(null)}>
          <div className="w-full max-w-4xl rounded-3xl bg-card border border-border p-4 md:p-6 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-2xl font-semibold">Ad Details & Insights</h3>
                <p className="text-sm text-muted-foreground">{selectedCampaign.business_name || "Business"} • {selectedCampaign.ad_type === "full" ? "No Skip" : "Skippable"}</p>
              </div>
              <button onClick={() => setSelectedCampaign(null)} className="px-3 py-1.5 rounded-lg border border-border text-sm">Close</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className="lg:col-span-2 rounded-2xl border border-border bg-muted/10 overflow-hidden">
                <div className="bg-black min-h-[280px] flex items-center justify-center">
                  {selectedCampaign.video_preview_url ? (
                    <video src={selectedCampaign.video_preview_url} controls className="w-full max-h-[390px] object-contain" />
                  ) : selectedCampaign.photo_preview_url ? (
                    <img src={selectedCampaign.photo_preview_url} alt="Campaign media" className="w-full max-h-[390px] object-contain" />
                  ) : (
                    <p className="text-muted-foreground text-sm">No media preview</p>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xl font-semibold">{selectedCampaign.ad_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedCampaign.description || "No description provided."}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="rounded-full bg-primary/15 text-primary text-xs px-2.5 py-1">{selectedCampaign.target_audience}</span>
                    {(selectedCampaign.target_region || []).map((region) => (
                      <span key={region} className="rounded-full bg-muted text-muted-foreground text-xs px-2.5 py-1">{region}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Views</p>
                  <p className="text-2xl font-bold">{selectedCampaign.metrics.views}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Detail Clicks</p>
                  <p className="text-2xl font-bold">{selectedCampaign.metrics.detail_clicks}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">CTR</p>
                  <p className="text-2xl font-bold">
                    {selectedCampaign.metrics.views > 0
                      ? `${((selectedCampaign.metrics.detail_clicks / selectedCampaign.metrics.views) * 100).toFixed(2)}%`
                      : "0.00%"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Days Left</p>
                  <p className="text-2xl font-bold">{selectedCampaign.days_left}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 mb-4">
              <h4 className="font-semibold mb-3">Insights Graph</h4>
              <div className="space-y-3">
                {(() => {
                  const views = Math.max(0, selectedCampaign.metrics.views || 0);
                  const clicks = Math.max(0, selectedCampaign.metrics.detail_clicks || 0);
                  const maxMetric = Math.max(1, views, clicks);
                  const viewsWidth = Math.max(8, Math.round((views / maxMetric) * 100));
                  const clicksWidth = Math.max(8, Math.round((clicks / maxMetric) * 100));
                  return (
                    <>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Views</span><span>{views}</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${viewsWidth}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Detail Clicks</span><span>{clicks}</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-secondary to-primary" style={{ width: `${clicksWidth}%` }} /></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/10 p-4">
              <h4 className="font-semibold mb-2">Campaign Plan</h4>
              <p className="text-sm text-muted-foreground">
                {selectedCampaign.budget_mode === "custom"
                  ? `Custom Budget ₹${Number(selectedCampaign.custom_budget || 0).toLocaleString()} @ ₹${Number(selectedCampaign.daily_price || customDailyPrice)} / day`
                  : `${selectedCampaign.package_name || "Package"} • ${selectedCampaign.package_duration_days || 0} days • ₹${Number(selectedCampaign.package_total_budget || 0).toLocaleString()}`}
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => handleViewDetails(selectedCampaign)}
                className="px-4 py-2 rounded-lg border border-border"
              >
                View Details
              </button>
              <button
                onClick={() => navigate(`/publisher/business-profile/${selectedCampaign.publisher_id}`)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold"
              >
                Open Business Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 p-3 md:p-5 flex items-center justify-center overflow-y-auto" onClick={() => !isSaving && !isUploading && setIsModalOpen(false)}>
          <div className="w-full max-w-4xl rounded-3xl bg-card border border-border p-4 md:p-6 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">Create Your Advertisement</h3>
              <p className="text-sm text-muted-foreground mt-1">Design your ad and choose a package</p>
            </div>

            <div className="max-h-[72vh] overflow-y-auto pr-1 space-y-4">
              <div className="rounded-2xl border border-border bg-muted/10 p-4 space-y-3">
                <p className="text-sm font-semibold">Company Logo</p>
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-4 flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setLogoFile(file);
                    }}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload" className="cursor-pointer text-sm text-muted-foreground flex-1">
                    {logoFile ? logoFile.name : "Upload logo"}
                  </label>
                  {logoFile && (
                    <button onClick={() => setLogoFile(null)} className="text-xs px-2 py-1 rounded-md bg-destructive/15 text-destructive">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Company Name</label>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Enter business name" className="w-full rounded-xl border border-border bg-card px-3 py-2.5" />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Ad Title</label>
                  <input value={adName} onChange={(e) => setAdName(e.target.value)} placeholder="Enter ad title" className="w-full rounded-xl border border-border bg-card px-3 py-2.5" />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/10 p-4 space-y-3">
                <p className="text-sm font-semibold">Ad Image</p>
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-4 flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPhotoFile(file);
                    }}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer text-sm text-muted-foreground flex-1">
                    {photoFile ? photoFile.name : "Upload image"}
                  </label>
                  {photoFile && (
                    <button onClick={() => setPhotoFile(null)} className="text-xs px-2 py-1 rounded-md bg-destructive/15 text-destructive">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/10 p-4 space-y-3">
                <p className="text-sm font-semibold">Ad Video (max 1 min)</p>
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-4 flex items-center gap-3">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setVideoFile(file);
                        const video = document.createElement("video");
                        video.src = URL.createObjectURL(file);
                        video.onloadedmetadata = () => {
                          setVideoDurationSeconds(Math.round(video.duration));
                        };
                      }
                    }}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer text-sm text-muted-foreground flex-1">
                    {videoFile ? videoFile.name : "Upload video"}
                  </label>
                  {videoFile && (
                    <button
                      onClick={() => {
                        setVideoFile(null);
                        setVideoDurationSeconds(undefined);
                      }}
                      className="text-xs px-2 py-1 rounded-md bg-destructive/15 text-destructive"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Ad Type</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setAdType("standard");
                      if (packageKey.startsWith("full")) setPackageKey("standard-monthly");
                    }}
                    className={adType === "standard" ? "w-full text-left rounded-xl border border-primary bg-primary/10 px-4 py-3" : "w-full text-left rounded-xl border border-border bg-card px-4 py-3"}
                  >
                    <p className="font-semibold">Standard Video Ad - ₹55/day</p>
                    <p className="text-xs text-muted-foreground">Skip button appears after 30 seconds</p>
                  </button>
                  <button
                    onClick={() => {
                      setAdType("full");
                      if (packageKey.startsWith("standard")) setPackageKey("full-monthly");
                    }}
                    className={adType === "full" ? "w-full text-left rounded-xl border border-primary bg-primary/10 px-4 py-3" : "w-full text-left rounded-xl border border-border bg-card px-4 py-3"}
                  >
                    <p className="font-semibold">Full Video Ad (No Skip) - ₹75/day</p>
                    <p className="text-xs text-muted-foreground">Maximum engagement, no skip button</p>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Payment Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setBudgetMode("custom")} className={budgetMode === "custom" ? "rounded-xl px-3 py-2.5 border border-primary bg-primary/10 font-semibold" : "rounded-xl px-3 py-2.5 border border-border bg-card"}>Custom Budget</button>
                  <button onClick={() => setBudgetMode("package")} className={budgetMode === "package" ? "rounded-xl px-3 py-2.5 border border-primary bg-primary/10 font-semibold" : "rounded-xl px-3 py-2.5 border border-border bg-card"}>Choose Package</button>
                </div>
              </div>

              {budgetMode === "custom" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">Budget (INR)</label>
                    <input value={customBudget} onChange={(e) => setCustomBudget(e.target.value)} type="number" placeholder="Enter budget" className="w-full rounded-xl border border-border bg-card px-3 py-2.5" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">Daily Price</label>
                    <input value={`₹${customDailyPrice}`} readOnly className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1.5">Run Days</label>
                    <input value={Number.isFinite(calculatedDays) ? `${calculatedDays} days` : "0 days"} readOnly className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5" />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold mb-2">Choose Package</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {packagePresets
                      .filter((pkg) => (adType === "standard" ? pkg.key.startsWith("standard") : pkg.key.startsWith("full")))
                      .map((pkg) => (
                        <button
                          key={pkg.key}
                          onClick={() => setPackageKey(pkg.key)}
                          className={
                            packageKey === pkg.key
                              ? "rounded-xl border border-primary bg-primary/10 p-3 text-center"
                              : "rounded-xl border border-border bg-card p-3 text-center"
                          }
                        >
                          <p className="font-semibold">{pkg.name.includes("Monthly") ? "Monthly" : pkg.name.includes("Quarterly") ? "Quarterly" : "Yearly"}</p>
                          <p className="text-2xl font-bold mt-1">₹{pkg.total.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground mt-1">{adType === "standard" ? "₹55/day" : "₹75/day"} • {pkg.days} days</p>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Target Audience</label>
                  <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2.5">
                    <option value="">Select audience...</option>
                    <option value="Students">Students</option>
                    <option value="Office Workers">Office Workers</option>
                    <option value="Business Owners">Business Owners</option>
                    <option value="Families">Families</option>
                    <option value="Senior Citizens">Senior Citizens</option>
                    <option value="General Public">General Public</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Target Region</label>
                  <select value={targetRegion} onChange={(e) => setTargetRegion(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2.5">
                    <option value="">Select region...</option>
                    <option value="North Zone">North Zone</option>
                    <option value="South Zone">South Zone</option>
                    <option value="East Zone">East Zone</option>
                    <option value="West Zone">West Zone</option>
                    <option value="Central">Central</option>
                    <option value="Urban">Urban</option>
                    <option value="Rural">Rural</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="Business website (optional)" className="rounded-xl border border-border bg-card px-3 py-2.5" />
                <input
                  type="number"
                  value={videoDurationSeconds ?? ""}
                  onChange={(e) => setVideoDurationSeconds(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Video duration in seconds"
                  className="rounded-xl border border-border bg-card px-3 py-2.5"
                />
              </div>

              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ad description" className="w-full rounded-xl border border-border bg-card px-3 py-2.5 min-h-[90px]" />

              <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                <p className="text-sm font-semibold">Budget Summary</p>
                <p className="text-sm text-muted-foreground mt-1">Base Budget: ₹{budgetMode === "custom" ? Number(customBudget || 0).toLocaleString() : selectedPackage.total.toLocaleString()}</p>
                <p className="text-sm text-primary font-semibold mt-1">
                  {budgetMode === "custom"
                    ? `Custom budget: ₹${customBudget || 0} gives ${calculatedDays} days`
                    : `${selectedPackage.name}: ${selectedPackage.days} days for ₹${selectedPackage.total.toLocaleString()}`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setIsModalOpen(false)} disabled={isSaving || isUploading} className="px-4 py-2 rounded-xl border border-border bg-card">Cancel</button>
              <button onClick={handlePublishAd} disabled={isSaving || isUploading} className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
                {isUploading ? "Uploading..." : isSaving ? "Processing..." : "Preview & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/45 p-3 md:p-5 flex items-center justify-center overflow-y-auto" onClick={() => !isProcessingPayment && setShowPreview(false)}>
          <div className="w-full max-w-3xl rounded-3xl bg-card border border-border p-4 md:p-6 my-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl md:text-3xl text-center font-semibold text-muted-foreground mb-5">Ad Preview - How users will see your ad</h3>

            <div className="rounded-3xl border border-border bg-muted/10 overflow-hidden mb-6">
              <div className="p-4 bg-card border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg border border-border bg-muted/20 overflow-hidden flex items-center justify-center">
                    {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-xs font-semibold">LOGO</span>}
                  </div>
                  <div>
                    <p className="font-semibold text-lg leading-tight">{businessName || "Your Business"}</p>
                    <p className="text-sm text-muted-foreground">Sponsored</p>
                  </div>
                </div>
              </div>

              <div className="relative bg-black">
                {videoPreviewUrl ? (
                  <video src={videoPreviewUrl} controls className="w-full max-h-[430px] object-contain" />
                ) : photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="Ad preview" className="w-full max-h-[430px] object-contain" />
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">Upload image or video to preview</div>
                )}
                <span className="absolute bottom-3 right-3 rounded-full bg-white/90 text-primary text-sm font-semibold px-3 py-1">
                  {adType === "full" ? "Sponsored - No Skip" : "Sponsored - Skip after 30s"}
                </span>
              </div>

              <div className="p-4 md:p-5 bg-card">
                <p className="text-2xl font-semibold leading-tight">{adName || "Ad title"}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="rounded-full bg-primary/15 text-primary text-sm font-semibold px-3 py-1">
                    {adType === "full" ? "Sponsored Ad - No Skip" : "Sponsored Ad - Skip in 30s"}
                  </span>
                  <span className="rounded-full bg-muted text-muted-foreground text-xs px-2.5 py-1">{targetAudience}</span>
                  <span className="rounded-full bg-muted text-muted-foreground text-xs px-2.5 py-1">{targetRegion}</span>
                </div>
                {description && <p className="text-sm text-muted-foreground mt-3">{description}</p>}
              </div>
            </div>

            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Payment Summary</p>
                <p className="font-semibold text-sm">{budgetMode === "custom" ? `${calculatedDays} days @ ₹${customDailyPrice}/day` : `${selectedPackage.name} (${selectedPackage.days} days)`}</p>
              </div>
              <p className="text-2xl font-bold text-primary">₹{totalAmount.toLocaleString()}</p>
            </div>

            <div className="flex justify-center gap-3">
              <button onClick={() => setShowPreview(false)} disabled={isProcessingPayment} className="px-5 py-2.5 rounded-xl border border-border bg-card">Edit Ad</button>
              <button onClick={handleConfirmAndPay} disabled={isProcessingPayment} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold">
                {isProcessingPayment ? "Processing..." : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default PublisherAdsDashboard;
