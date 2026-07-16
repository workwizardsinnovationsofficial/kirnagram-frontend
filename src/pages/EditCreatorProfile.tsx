import { MainLayout } from "@/components/layout/MainLayout";
import { ArrowLeft, FileText, Instagram, Youtube, Facebook, Camera, Save, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import avatar2 from "@/assets/avatar-2.jpg";
import { auth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

const EditCreatorProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<string>(avatar2);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    website: "",
    websiteName: "",
    instagram: "",
    youtube: "",
    facebook: "",
    x: "",
    linkedin: "",
    whatsapp: "",
  });


  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Fetch profile data on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("https://api.kirnagram.com/profile/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile(data);
        setForm({
          website: data.website || "",
          websiteName: data.website_name || "",
          instagram: data.instagram || "",
          youtube: data.youtube || "",
          facebook: data.facebook || "",
          x: data.x || "",
          linkedin: data.linkedin || "",
          whatsapp: data.whatsapp || "",
        });
      } catch (e) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaved(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      const res = await fetch("https://api.kirnagram.com/ai-creator/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          website: form.website,
          website_name: form.websiteName,
          instagram: form.instagram,
          youtube: form.youtube,
          facebook: form.facebook,
          x: form.x,
          linkedin: form.linkedin,
          whatsapp: form.whatsapp,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.detail?.message || payload?.detail || "Failed to save creator profile");
      }

      toast({
        title: "Profile updated",
        description: "Creator profile details saved successfully.",
      });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Could not update creator profile",
        variant: "destructive",
      });
      setSaved(false);
    } finally {
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-2xl mx-auto px-3 md:px-0 pb-24 md:pb-8 flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </MainLayout>
    );
  }
  if (!profile) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-2xl mx-auto px-3 md:px-0 pb-24 md:pb-8 flex items-center justify-center h-96">
          <p className="text-muted-foreground">Failed to load profile</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-2xl mx-auto px-3 md:px-0 pb-24 md:pb-8 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-display font-bold">Edit Creator Profile</h1>
            <p className="text-sm text-muted-foreground">Update your creator information</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Website Links */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-sm font-medium mb-4">Website</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Website Name</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text"
                    name="websiteName"
                    placeholder="e.g., My Portfolio, My Blog"
                    value={form.websiteName}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Website URL</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <input 
                    type="url"
                    name="website"
                    placeholder="https://yourwebsite.com"
                    value={form.website}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-sm font-medium mb-4">Social Media Links</h3>
            <div className="space-y-3">
              <div className="relative">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" />
                <input 
                  type="text"
                  name="instagram"
                  placeholder="Instagram URL"
                  value={form.instagram}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="relative">
                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                <input 
                  type="text"
                  name="youtube"
                  placeholder="YouTube URL"
                  value={form.youtube}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="relative">
                <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <input 
                  type="text"
                  name="facebook"
                  placeholder="Facebook URL"
                  value={form.facebook}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500" viewBox="0 0 24 24"><path d="M22.46 5.924c-.793.352-1.645.59-2.54.698a4.48 4.48 0 0 0 1.963-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 16.11 4c-2.48 0-4.49 2.01-4.49 4.49 0 .352.04.695.116 1.022C7.728 9.36 4.1 7.6 1.67 4.98c-.386.664-.607 1.437-.607 2.26 0 1.56.795 2.94 2.005 3.75a4.48 4.48 0 0 1-2.034-.563v.057c0 2.18 1.55 4 3.6 4.42-.377.104-.775.16-1.185.16-.29 0-.57-.028-.845-.08.57 1.78 2.23 3.08 4.2 3.12A8.98 8.98 0 0 1 2 19.54a12.7 12.7 0 0 0 6.88 2.02c8.26 0 12.78-6.84 12.78-12.78 0-.195-.004-.39-.013-.583A9.1 9.1 0 0 0 24 4.59a8.98 8.98 0 0 1-2.54.698z"/></svg>
                <input 
                  type="text"
                  name="x"
                  placeholder="X (Twitter) URL"
                  value={form.x}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-8.5 19h-3v-8h3v8zm-1.5-9.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 9.268h-3v-4.5c0-1.07-.93-2-2-2s-2 .93-2 2v4.5h-3v-8h3v1.085c.41-.63 1.36-1.085 2.5-1.085 1.93 0 3.5 1.57 3.5 3.5v4.5z"/></svg>
                <input 
                  type="text"
                  name="linkedin"
                  placeholder="LinkedIn URL"
                  value={form.linkedin}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" viewBox="0 0 32 32"><path d="M16 3C9.373 3 4 8.373 4 15c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm0 22c-5.523 0-10-4.477-10-10S10.477 5 16 5s10 4.477 10 10-4.477 10-10 10zm-1-15h2v6h-2zm0 8h2v2h-2z"/></svg>
                <input 
                  type="text"
                  name="whatsapp"
                  placeholder="WhatsApp Channel URL"
                  value={form.whatsapp}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSave}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </MainLayout>
  );

};

export default EditCreatorProfile;