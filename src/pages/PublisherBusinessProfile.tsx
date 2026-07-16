import { MainLayout } from "@/components/layout/MainLayout";
import { BarChart3, Globe, Link2, MapPin, MessageCircle, Users, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { publisherApi } from "@/lib/publisherApi";
import { auth } from "@/firebase";

const PublisherBusinessProfile = () => {
  const navigate = useNavigate();
  const { publisherId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    about: "",
    website: "",
    address: "",
    headquarters: "",
    whatsapp: "",
  });

  const canEdit = auth.currentUser?.uid === publisherId;

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await publisherApi.getPublisherProfile(publisherId);
        setData(res);
        const profile = res?.business_profile || {};
        setForm({
          business_name: profile.business_name || "",
          about: profile.about || "",
          website: profile.website || "",
          address: profile.address || "",
          headquarters: profile.headquarters || "",
          whatsapp: profile.whatsapp || "",
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load business profile");
      } finally {
        setLoading(false);
      }
    };

    if (publisherId) {
      run();
    }
  }, [publisherId]);

  if (loading) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-4xl mx-auto p-6"><p className="text-muted-foreground">Loading business profile...</p></div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-4xl mx-auto p-6"><p className="text-red-500">{error || "Profile not available"}</p></div>
      </MainLayout>
    );
  }

  const profile = data.business_profile || {};
  const owner = data.publisher || {};
  const campaigns = data.active_campaigns || [];
  const canViewInsights = Boolean(data.can_view_insights);
  const insights = data.insights || {};
  const followersCount = data.followers_count || 0;
  const connectionsCount = data.connections_count || 0;
  const logo = profile.logo_url || owner.image_name || "";
  const maxMetric = Math.max(
    1,
    ...campaigns.map((campaign: any) => Math.max(campaign?.metrics?.views || 0, campaign?.metrics?.detail_clicks || 0))
  );

  const handleSaveProfile = async () => {
    if (!form.business_name.trim() || !form.about.trim() || !form.address.trim()) {
      setError("Business name, description, and address are required.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await publisherApi.updateMyBusinessProfile({
        business_name: form.business_name.trim(),
        about: form.about.trim(),
        website: form.website.trim() || undefined,
        address: form.address.trim(),
        headquarters: form.headquarters.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
      });
      await (async () => {
        const res = await publisherApi.getPublisherProfile(publisherId);
        setData(res);
        const refreshedProfile = res?.business_profile || {};
        setForm({
          business_name: refreshedProfile.business_name || "",
          about: refreshedProfile.about || "",
          website: refreshedProfile.website || "",
          address: refreshedProfile.address || "",
          headquarters: refreshedProfile.headquarters || "",
          whatsapp: refreshedProfile.whatsapp || "",
        });
      })();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save business profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-primary/25 via-secondary/20 to-primary/15" />
          <div className="px-5 md:px-6 pb-6 -mt-10">
            <div className="flex flex-wrap items-center justify-end gap-2 mb-3">
              <button
                onClick={() => navigate(-1)}
                className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm"
              >
                Back
              </button>
              {canEdit && !isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setError(null);
                  }}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold"
                >
                  Edit Business Page
                </button>
              )}
            </div>

            {isEditing && canEdit && (
              <div className="rounded-2xl border border-border bg-muted/15 p-4 mb-4 space-y-3">
                <p className="font-semibold">Edit Company Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Business Name *</label>
                    <input
                      value={form.business_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, business_name: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Website</label>
                    <input
                      value={form.website}
                      onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Address *</label>
                    <input
                      value={form.address}
                      onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Headquarters</label>
                    <input
                      value={form.headquarters}
                      onChange={(e) => setForm((prev) => ({ ...prev, headquarters: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Description *</label>
                    <textarea
                      value={form.about}
                      onChange={(e) => setForm((prev) => ({ ...prev, about: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 min-h-[90px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">WhatsApp</label>
                    <input
                      value={form.whatsapp}
                      onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                    }}
                    className="px-3 py-2 rounded-lg border border-border"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            <div className="w-20 h-20 rounded-2xl border border-border bg-card overflow-hidden flex items-center justify-center mb-3">
              {logo ? <img src={logo} alt="Business logo" className="w-full h-full object-cover" /> : <span className="text-xs font-semibold">LOGO</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">{profile.business_name || "Business"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Company page • Publisher Business Profile</p>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Followers</p>
                <p className="text-2xl font-bold">{followersCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Connections</p>
                <p className="text-2xl font-bold">{connectionsCount}</p>
              </div>
              {canViewInsights && (
                <>
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Ad Views</p>
                    <p className="text-2xl font-bold">{insights.total_views || 0}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Detail Clicks</p>
                    <p className="text-2xl font-bold">{insights.total_detail_clicks || 0}</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3 flex items-center gap-2"><UserRound className="w-4 h-4" /> <span className="text-sm">Owner: {owner.full_name || "N/A"}</span></div>
              <div className="rounded-xl border border-border p-3 flex items-center gap-2"><MessageCircle className="w-4 h-4" /> <span className="text-sm">WhatsApp: {profile.whatsapp || "N/A"}</span></div>
              <div className="rounded-xl border border-border p-3 flex items-center gap-2"><Globe className="w-4 h-4" /> <span className="text-sm">Website: {profile.website || "N/A"}</span></div>
              <div className="rounded-xl border border-border p-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> <span className="text-sm">Address: {profile.address || "N/A"}</span></div>
              <div className="rounded-xl border border-border p-3 flex items-center gap-2 md:col-span-2"><Link2 className="w-4 h-4" /> <span className="text-sm">Headquarters: {profile.headquarters || "N/A"}</span></div>
            </div>

            <div className="mt-5">
              <h2 className="font-semibold mb-2">About Company</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{profile.about || "No business bio yet."}</p>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Total Insights Dashboard</h2>
              <span className="text-xs rounded-full border border-border px-2.5 py-1">CTR {insights.engagement_rate || 0}%</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{insights.active_campaigns || 0}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{insights.total_views || 0}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{insights.total_detail_clicks || 0}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4" />
                <p className="font-semibold">Campaign-wise Performance Graph</p>
              </div>
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active campaigns yet.</p>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign: any) => {
                    const views = campaign?.metrics?.views || 0;
                    const clicks = campaign?.metrics?.detail_clicks || 0;
                    const viewWidth = Math.max(8, Math.round((views / maxMetric) * 100));
                    const clickWidth = Math.max(8, Math.round((clicks / maxMetric) * 100));
                    return (
                      <div key={campaign._id} className="space-y-2">
                        <p className="text-sm font-medium">{campaign.ad_name}</p>
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Views</span><span>{views}</span></div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${viewWidth}%` }} /></div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Detail Clicks</span><span>{clicks}</span></div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-secondary to-primary" style={{ width: `${clickWidth}%` }} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-border p-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{followersCount} followers • {connectionsCount} connections</span>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PublisherBusinessProfile;
