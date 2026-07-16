import { useState, useRef, useEffect } from "react";
import { auth } from "@/firebase";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, ArrowRight, User, Mail, Phone, Calendar, Instagram, Youtube, Facebook, 
  Upload, CheckCircle, Clock, Camera, IndianRupee, Plus, FileText, Edit, 
  Heart, MessageCircle, TrendingUp, Settings, Share2, BadgeCheck, Award, XCircle, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import avatar2 from "@/assets/avatar-2.jpg";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import creatorLogo from "@/assets/ai-creator-icon-2.png";
// import heroBanner from "@/assets/hero-banner.jpg"; // Removed duplicate if already imported elsewhere
import { MainLayout } from "@/components/layout/MainLayout";
import heroBanner from "@/assets/hero-banner.jpg";

const steps = ["Personal", "Social Media"];

const creatorLandingBenefits = [
  { icon: IndianRupee, title: "Earnings Program", description: "Earn Money from approved prompt remixes." },
  { icon: Share2, title: "Community Growth", description: "Build your creator audience with better visibility." },
  { icon: TrendingUp, title: "Analytics Dashboard", description: "Track performance insights and remix trends." },
  { icon: BadgeCheck, title: "Verified Badge", description: "Get trusted creator status after approval." },
  { icon: Heart, title: "Priority Support", description: "Faster help for active AI creators." },
];

const API_URL = "http://127.0.0.1:8000";
const getPayoutPerRemix = (prompt: any) => Number(prompt?.payout_per_remix ?? 1) || 1;

const AICreator = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    dob: "",
    instagram: "",
    youtube: "",
    x: "",
    linkedin: "",
    facebook: "",
    website: "",
  });
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);

  const normalizeMobile = (value?: string) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length > 10) return digits.slice(-10);
    return digits;
  };

  const isProfileComplete = (data: any) => {
    const requiredFields = ["username", "mobile", "dob", "gender"];
    const hasAllRequiredFields = requiredFields.every((field) => String(data?.[field] || "").trim() !== "");
    const username = String(data?.username || "").trim().toLowerCase();
    const hasRealUsername = Boolean(username) && !username.startsWith("temp_");
    return hasAllRequiredFields && hasRealUsername;
  };

  const hasVerifiedMobile = (data: any) => {
    const currentMobile = normalizeMobile(data?.mobile);
    const persistentVerifiedMobile = normalizeMobile(data?.mobile_verified_mobile);
    const persistentVerifiedAt = data?.mobile_verified_at;
    const verifiedObj = data?.mobile_change_verified || {};
    const verifiedMobile = normalizeMobile(verifiedObj?.mobile);
    if (currentMobile && persistentVerifiedMobile && persistentVerifiedAt && currentMobile === persistentVerifiedMobile) {
      return true;
    }
    return Boolean(currentMobile && verifiedMobile && currentMobile === verifiedMobile && verifiedObj?.verified_at);
  };

  const profileBlockedMessage = !loading && profile && !isApproved && (!isProfileComplete(profile) || !hasVerifiedMobile(profile));

  // Fetch user profile and application status
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = auth.currentUser;
        if (!user) {
          setError("Not logged in");
          setLoading(false);
          return;
        }
        // Fetch profile from backend (for mobile)
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile(data);
        setForm(f => ({
          ...f,
          fullName: data.full_name || user.displayName || "",
          email: data.email || user.email || "",
          mobile: data.mobile || "",
          dob: data.dob || "",
          facebook: data.facebook || "",
        }));
        // Fetch AI Creator application status
        const appRes = await fetch(`${API_URL}/ai-creator/application/${data.firebase_uid}`);
        if (appRes.ok) {
          const appData = await appRes.json();
          setApplication(appData);
          if (appData.status === "pending") setIsSubmitted(true);
          if (appData.status === "approved") setIsApproved(true);
          if (appData.status === "rejected") setIsRejected(true);
          if (appData.status === "suspended") {
            setIsSuspended(true);
            setSuspendedUntil(appData.suspended_until || null);
          }
          if (appData.status === "blocked") {
            setIsBlocked(true);
          }
        }
      } catch (e: any) {
        // If 404, no application exists
        if (e.message && e.message.includes("404")) {
          setApplication(null);
        } else {
          setError(e.message || "Unknown error");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchPrompts = async () => {
      if (!isApproved || !profile) {
        setPrompts([]);
        setPromptsLoading(false);
        return;
      }
      try {
        setPromptsLoading(true);
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/ai-creator/prompts/me?status=all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return setPrompts([]);
        const data = await res.json();
        setPrompts(Array.isArray(data) ? data : []);
      } catch (err) {
        setPrompts([]);
      } finally {
        setPromptsLoading(false);
      }
    };

    fetchPrompts();
  }, [profile, isApproved]);

  // --- Earnings logic: use API totalEarnings (not calculated from prompts) ---
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [remixes, setRemixes] = useState<any[]>([]);
  const [summaryRemixCount, setSummaryRemixCount] = useState(0);
  const totalRemixes = summaryRemixCount > 0 ? summaryRemixCount : remixes.length;
  const availableBalance = Math.max(0, totalEarnings - totalWithdrawn);

  useEffect(() => {
    const fetchEarningsData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        // Fetch remixes for count
        const remixesRes = await fetch(`${API_URL}/remix/my-remixes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (remixesRes.ok) {
          const remixesData = await remixesRes.json();
          setRemixes(remixesData.remixes || []);
        }
        // Fetch earnings summary with accurate totalEarnings and totalRemixes
        const res = await fetch(`${API_URL}/withdraw/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTotalEarnings(data.totalEarnings || 0);
          setTotalWithdrawn(data.totalWithdrawn || 0);
          setSummaryRemixCount(data.totalRemixes || 0);
        }
      } catch {}
    };
    fetchEarningsData();
  }, []);

  // Handle input changes
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // URL validation for social links
  const isValidUrl = (url: string, domain: string) => {
    if (!url) return true;
    try {
      const u = new URL(url);
      return u.hostname.includes(domain);
    } catch {
      return false;
    }
  };

  // Submit application
  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Validate URLs
      if (!isValidUrl(form.instagram, "instagram.com")) return setError("Instagram URL invalid");
      if (!isValidUrl(form.youtube, "youtube.com")) return setError("YouTube URL invalid");
      if (!isValidUrl(form.x, "x.com")) return setError("X (Twitter) URL invalid");
      if (!isValidUrl(form.facebook, "facebook.com") && !isValidUrl(form.facebook, "facebook.com")) return setError("facebook/Facebook URL invalid");
      if (form.website && !isValidUrl(form.website, ".")) return setError("Website URL invalid");
      try {
        setLoading(true);
        setError(null);
        const user = auth.currentUser;
        if (!user || !profile) throw new Error("Not logged in");
        const payload = {
          user_id: profile.firebase_uid,
          full_name: form.fullName,
          email: form.email,
          mobile: form.mobile,
          dob: form.dob,
          instagram: form.instagram,
          youtube: form.youtube,
          x: form.x,
          facebook: form.facebook,
          website: form.website,
        };
        const res = await fetch(`${API_URL}/ai-creator/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to submit application");
        setIsSubmitted(true);
      } catch (e: any) {
        setError(e.message || "Failed to submit");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleAadhaarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAadhaarPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      setSelfiePhoto(canvasRef.current.toDataURL("image/jpeg"));
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraOpen(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-300 shadow-lg shadow-orange-300/20">
              <div className="h-12 w-12 rounded-full border-4 border-white border-t-transparent animate-spin" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-3">Preparing AI Creator Studio</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Loading your creator dashboard, insights, and prompt tools.
            </p>
            {error && <p className="text-red-500 mb-6">{error}</p>}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Application status UI
  if (isSubmitted && !isApproved && !isRejected) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 pb-24 md:pb-10">
          <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 md:p-8 text-center shadow-[0_16px_40px_rgba(245,158,11,0.2)]">
            <p className="text-[11px] md:text-xs tracking-[0.16em] uppercase text-amber-300/90 mb-4">Status Update</p>
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-2 text-zinc-100">Application Under Review</h1>
            <p className="text-zinc-300 mb-6 text-sm md:text-base max-w-xl mx-auto">
              Your AI Creator application is submitted successfully. Our team is now verifying your details.
            </p>

            <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/60 p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-300">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <span>Review in progress. You will be notified once approved.</span>
              </div>
            </div>

            <button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 dark:text-white font-semibold hover:from-amber-400 hover:to-orange-500 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }
  if (isRejected) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 pb-24 md:pb-10">
          <div className="rounded-3xl border border-red-500/25 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 md:p-8 text-center shadow-[0_16px_40px_rgba(239,68,68,0.18)]">
            <p className="text-[11px] md:text-xs tracking-[0.16em] uppercase text-red-300/90 mb-4">Status Update</p>
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-2 text-zinc-100">Application Rejected</h1>
            <p className="text-zinc-300 mb-6 text-sm md:text-base max-w-xl mx-auto">
              Your application was not approved this time. You can update your details and apply again.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setIsRejected(false);
                  setIsSubmitted(false);
                  setCurrentStep(0);
                  setShowApplicationForm(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 dark:text-white font-semibold hover:from-amber-400 hover:to-orange-500 transition-colors"
              >
                Update and Re-apply
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="px-6 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted/40 transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isSuspended || isBlocked) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 pb-24 md:pb-10">
          <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 md:p-8 text-center shadow-[0_16px_40px_rgba(249,115,22,0.2)]">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-orange-300" />
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-3 text-zinc-100">
              AI Creator Account Restricted
            </h1>
            <p className="text-zinc-300 mb-2 text-sm md:text-base">
              {isBlocked
                ? "Your AI Creator account is permanently blocked due to policy violations."
                : "Your AI Creator account is temporarily suspended due to policy violations."}
            </p>
            {isSuspended && suspendedUntil && (
              <p className="text-orange-200/90 mb-2 text-xs md:text-sm">
                Suspension active until {new Date(suspendedUntil).toLocaleDateString()}.
              </p>
            )}
            {isBlocked && (
              <p className="text-orange-200/90 mb-2 text-xs md:text-sm">
                This block is permanent for AI Creator features.
              </p>
            )}
            <p className="text-zinc-300 mb-6 text-sm md:text-base">
              Want to revoke the account? Contact us at aicreator@kirnagram.com
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 dark:text-white font-semibold hover:from-amber-400 hover:to-orange-500 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (profileBlockedMessage) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 pb-24 md:pb-10">
          <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 md:p-8 text-center shadow-[0_16px_40px_rgba(245,158,11,0.16)]">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-3 text-zinc-100">
              First complete your profile
            </h1>
            <p className="text-zinc-300 mb-2 text-sm md:text-base max-w-xl mx-auto">
              To continue and become an AI Creator, complete your username, date of birth, gender, and verify your mobile number.
            </p>
            <p className="text-zinc-400 mb-6 text-xs md:text-sm max-w-lg mx-auto">
              Required: username, date of birth, gender, and verified mobile number.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate("/edit-profile")}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 dark:text-white font-semibold hover:from-amber-400 hover:to-orange-500 transition-colors"
              >
                Complete Profile
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="px-6 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted/40 transition-colors"
              >
                Open Settings
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Dashboard after approval - Profile style
  if (isApproved && profile) {
    // Count prompts that are still live/active for creators.
    // delete_requested is still visible until admin approval removes it.
    const activePrompts = prompts.filter((p) => {
      const status = String(p?.status || "").toLowerCase();
      return (status === "approved" || status === "delete_requested") && !p?.is_deleted;
    });
    const promptsCount = activePrompts.length;
    // Use summaryRemixCount if available, else count remixes for active prompts
    const activePromptIds = new Set(activePrompts.map((p) => p.id || p._id));
    const remixesCount =
      summaryRemixCount > 0
        ? summaryRemixCount
        : remixes.filter((r) => activePromptIds.has(r.prompt_id || r.promptId)).length;
    const stats = [
      { label: "Prompts", value: String(promptsCount) },
      { label: "Remixes", value: String(remixesCount) },
    ];

    // Avatar and cover image logic (same as Profile)
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
          {/* Cover Photo */}
          <div className="relative h-32 sm:h-44 md:h-52 rounded-none sm:rounded-2xl overflow-hidden">
            <img
              src={coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          </div>

          {/* Profile Info */}
          <div className="relative px-4 -mt-14 sm:-mt-16">
            {/* Avatar and Actions Row */}
            <div className="flex items-end justify-between mb-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-r from-primary to-secondary">
                  <img
                    src={fallbackAvatar}
                    alt="Creator"
                    className="w-full h-full rounded-full object-cover border-4 border-background"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-green-500 rounded-full text-[10px] font-bold text-gray-900 dark:text-white border-2 border-background">
                  CREATOR
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-2">
                
              </div>
            </div>

            {/* Name and Badge */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-display font-bold">
                  {profile.full_name || profile.username || profile.public_id || "AI Creator"}
                </h1>
                <img src={creatorLogo} alt="Creator" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 text-primary text-xs font-bold rounded-full">
                  AI CREATOR
                </span>
                <p className="text-muted-foreground text-sm">
                  @{profile.username || profile.public_id || "user"}
                </p>
              </div>
            </div>

            {/* Stats (no followers, all 0) */}
            <div className="flex gap-6 py-4 border-y border-border">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-lg sm:text-xl font-display font-bold">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
              {/* Earnings Card UI block: only Available Balance */}
              <div className="flex-1 text-right">
                <div className="inline-block p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground mb-1 text-right">Available Balance</p>
                  <p className="text-lg sm:text-xl font-display font-bold text-green-500 text-right">₹{availableBalance}</p>
                </div>
              </div>
            </div>

            {/* Social Media Icons Row */}
            {(profile.instagram || profile.youtube || profile.facebook || profile.x || profile.linkedin || profile.whatsapp || profile.website) && (
              <div className="flex gap-3 justify-center py-4 border-b border-border">
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
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" title={profile.website_name || "Website"} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
           
          </div>

          {/* Dashboard Options */}
          <div className="px-4 grid grid-cols-2 gap-3 mt-0">
            <Link
              to="/ai-creator/earnings"
              className="p-4 md:p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl hover:border-green-500/40 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-green-500/20 flex items-center justify-center mb-3">
                <IndianRupee className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="font-semibold mb-0.5">Earnings</h3>
              <p className="text-xs text-muted-foreground">View analytics</p>
            </Link>

            <Link
              to="/ai-creator/edit-profile"
              className="p-4 md:p-5 bg-card border border-border rounded-2xl hover:border-primary/50 md:hover:border-border/80 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Edit className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-semibold mb-0.5">Edit Profile</h3>
              <p className="text-xs text-muted-foreground">Update creator details</p>
            </Link>

            <Link
              to="/ai-creator/add-prompt"
              className="p-4 md:p-5 bg-card border border-border rounded-2xl hover:border-primary/50 md:hover:border-border/80 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-semibold mb-0.5">Add New Prompt</h3>
              <p className="text-xs text-muted-foreground">Create AI style</p>
            </Link>

            <Link
              to="/ai-creator/prompts"
              className="p-4 md:p-5 bg-card border border-border rounded-2xl hover:border-secondary/50 md:hover:border-border/80 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-semibold mb-0.5">My Prompts</h3>
              <p className="text-xs text-muted-foreground">Manage styles</p>
            </Link>

          </div>
        </div>
      </MainLayout>
    );
  }

  // Registration flow
  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-3xl mx-auto px-4 py-5 md:py-8 pb-24 md:pb-10">
        {!showApplicationForm ? (
          <div className="space-y-7">
            <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 md:p-7 text-gray-900 dark:text-white shadow-[0_18px_45px_rgba(245,158,11,0.2)]">
              <p className="text-center text-[11px] md:text-xs tracking-[0.18em] uppercase text-amber-300/90 mb-4">Official Creator Program</p>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_8px_24px_rgba(251,146,60,0.35)]">
                <Award className="w-9 h-9 text-gray-900 dark:text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-center mb-2">Become a Creator</h1>
              <h2 className="text-xl md:text-2xl font-semibold text-center mb-3 text-zinc-100">Join Our Creator Community</h2>
              <p className="text-center text-zinc-300 text-sm md:text-base max-w-xl mx-auto">
                Share your creativity, earn money, and inspire others with your unique prompts.
              </p>
              <button
                onClick={() => setShowApplicationForm(true)}
                className="mt-6 w-full rounded-xl py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 dark:text-white font-semibold hover:from-amber-400 hover:to-orange-500 transition-colors"
              >
                Start Creator Application
              </button>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/70 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-5">
                <h3 className="text-2xl font-display font-bold text-foreground">Benefits</h3>
                <span className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-amber-300/80">Program Highlights</span>
              </div>

              <div className="space-y-2.5">
                {creatorLandingBenefits.map((item, index) => (
                  <div key={item.title} className="rounded-xl border border-border/70 bg-background/60 px-3.5 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 border border-amber-500/20 shrink-0">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold text-amber-300/80">{`0${index + 1}`.slice(-2)}</span>
                          <p className="text-sm md:text-[15px] font-semibold text-zinc-100">{item.title}</p>
                        </div>
                        <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">{item.description}</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl mx-auto bg-card/95 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] p-5 md:p-6 border border-border/80">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl md:text-2xl font-display font-bold">Creator Application</h2>
                <p className="text-xs md:text-sm text-muted-foreground">Complete this quick 2-step verification form</p>
              </div>
              <button
                onClick={() => {
                  setShowApplicationForm(false);
                  setCurrentStep(0);
                  setError(null);
                }}
                className="text-xs md:text-sm px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                Overview
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {steps.map((step, i) => (
                <div key={step} className={cn("rounded-lg border px-3 py-2", i <= currentStep ? "border-amber-500/35 bg-amber-500/10" : "border-border bg-muted/30")}>
                  <p className={cn("text-xs font-medium text-center", i <= currentStep ? "text-foreground" : "text-muted-foreground")}>{step}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {currentStep === 0 && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-primary">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        readOnly
                        className="w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-primary">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="date"
                        name="dob"
                        value={form.dob}
                        readOnly
                        className="w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-primary">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        readOnly
                        className="w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-primary">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel"
                        name="mobile"
                        value={form.mobile}
                        readOnly
                        className="w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </>
              )}

              {currentStep === 1 && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-primary">Instagram</label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        name="instagram"
                        value={form.instagram}
                        onChange={handleInput}
                        placeholder="https://instagram.com/username"
                        className="w-full pl-10 pr-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-primary">YouTube</label>
                    <div className="relative">
                      <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        name="youtube"
                        value={form.youtube}
                        onChange={handleInput}
                        placeholder="https://youtube.com/@channel"
                        className="w-full pl-10 pr-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-primary">X (Twitter)</label>
                    <div className="relative">
                      <Share2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        name="x"
                        value={form.x}
                        onChange={handleInput}
                        placeholder="https://x.com/username"
                        className="w-full pl-10 pr-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-primary">Facebook</label>
                    <div className="relative">
                      <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        name="facebook"
                        value={form.facebook}
                        onChange={handleInput}
                        placeholder="https://facebook.com/username"
                        className="w-full pl-10 pr-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-primary">Website / Portfolio</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        name="website"
                        value={form.website}
                        onChange={handleInput}
                        placeholder="https://yourwebsite.com"
                        className="w-full pl-10 pr-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-5 flex gap-3 flex-col sm:flex-row">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors bg-background"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-5 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 dark:text-white rounded-lg text-sm font-semibold hover:from-amber-400 hover:to-orange-500 transition-colors",
                  currentStep > 0 ? "flex-1" : "w-full"
                )}
              >
                {currentStep === steps.length - 1 ? "Submit Application" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {error && <div className="text-red-500 text-center mt-3 text-sm">{error}</div>}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AICreator;