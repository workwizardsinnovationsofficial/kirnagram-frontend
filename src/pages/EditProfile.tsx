import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
  Camera,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Save,
  AtSign,
  FileText,
  Users,
  ChevronDown,
  X,
  RotateCw,
  Crosshair,
  BadgeCheck,
} from "lucide-react";
import Cropper from "react-easy-crop";
import avatar2 from "@/assets/avatar-2.jpg";
import heroBanner from "@/assets/hero-banner2.png";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";
import { MainLayout } from "@/components/layout/MainLayout";
import { auth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.kirnagram.com";
const FULL_NAME_COOLDOWN_DAYS = 14;

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

const EditProfile = (): JSX.Element => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraCaptureCanvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showCoverSheet, setShowCoverSheet] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState<string>("");
  const [cropType, setCropType] = useState<"profile" | "cover">("profile");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const genderDropdownRef = useRef<HTMLDivElement>(null);
  const usernameRequestIdRef = useRef(0);
  const initialPublicIdRef = useRef("");
  const initialUsernameRef = useRef("");
  const initialNameRef = useRef("");
  const initialPhoneRef = useRef("");
  const initialEmailRef = useRef("");
  const [genderOpen, setGenderOpen] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [fullNameCooldownDays, setFullNameCooldownDays] = useState(0);
  const [nameCooldownMessage, setNameCooldownMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpMessageIsError, setOtpMessageIsError] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(true);
  const [emailSendingOtp, setEmailSendingOtp] = useState(false);
  const [emailVerifyingOtp, setEmailVerifyingOtp] = useState(false);
  const [emailOtpMessage, setEmailOtpMessage] = useState("");
  const [emailOtpMessageIsError, setEmailOtpMessageIsError] = useState(false);

  const [formData, setFormData] = useState({
    publicId: "",
    name: "",
    username: "",
    email: "",
    phone: "",
    dob: "",
    location: "",
    website: "",
    bio: "",
    gender: "",
  });

  const getGenderFallback = (gender?: string, imageName?: string) => {
    // If image is a real uploaded file (from R2 or Google, valid URL), use it
    if (imageName && imageName.trim() !== "" && 
        !imageName.includes("default") && 
        !imageName.includes("placeholder")) {
      return imageName;
    }
    // Otherwise use gender-based icon
    if (gender === "male") return maleIcon;
    if (gender === "female") return femaleIcon;
    return profileIcon;
  };

  const normalizePhone = (value: string) => {
    const digits = (value || "").replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) {
      return digits.slice(2);
    }
    return digits;
  };

  const normalizePhoneInput = (value: string) => {
    let digits = (value || "").replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length >= 12) {
      digits = digits.slice(2);
    }
    return digits.slice(0, 10);
  };

  const getRemainingNameCooldownDays = (updatedAt?: string) => {
    if (!updatedAt) return 0;
    const lastUpdatedMs = new Date(updatedAt).getTime();
    if (!Number.isFinite(lastUpdatedMs)) return 0;

    const nowMs = Date.now();
    const cooldownMs = FULL_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    const remainingMs = lastUpdatedMs + cooldownMs - nowMs;
    if (remainingMs <= 0) return 0;

    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  };

  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [oldMobileVerified, setOldMobileVerified] = useState(false);
  const [otpTargetMobile, setOtpTargetMobile] = useState<string | null>(null);

  const isPhoneChanged = normalizePhone(formData.phone) !== normalizePhone(initialPhoneRef.current);
  const isNameChanged = (formData.name || "").trim() !== (initialNameRef.current || "").trim();
  const isUsernameChanged = (formData.username || "").trim() !== (initialUsernameRef.current || "").trim();
  const isEmailChanged = (formData.email || "").trim().toLowerCase() !== (initialEmailRef.current || "").trim().toLowerCase();
  const isPublicIdChanged = (formData.publicId || "").trim().toLowerCase() !== (initialPublicIdRef.current || "").trim().toLowerCase();
  const isNameChangeBlocked = isNameChanged && fullNameCooldownDays > 0;
  const requiresOtp = false;
  const requiresEmailOtp = false;
  const isSaveDisabled =
    saving ||
    usernameStatus === "checking" ||
    usernameStatus === "taken" ||
    usernameStatus === "error" ||
    !formData.username?.trim() ||
    isNameChangeBlocked;

  // 🔹 LOAD PROFILE
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();

        const res = await fetch(`${API_BASE}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        setFormData({
          publicId: data.public_id || "",
          name: data.full_name || "",
          username: data.username || "",
          email: data.email || "",
          phone: data.mobile || "",
          dob: data.dob || "",
          location: data.location || "",
          website: data.website || "",
          bio: data.bio || "",
          gender: data.gender || "",
        });
        initialPublicIdRef.current = (data.public_id || "").trim().toLowerCase();
        initialUsernameRef.current = (data.username || "").trim();
        initialNameRef.current = (data.full_name || "").trim();
        initialEmailRef.current = (data.email || "").trim().toLowerCase();
        initialPhoneRef.current = data.mobile || "";

        const remainingDays = getRemainingNameCooldownDays(data.full_name_updated_at);
        setFullNameCooldownDays(remainingDays);
        if (remainingDays > 0) {
          setNameCooldownMessage(`You can change full name again in ${remainingDays} day(s)`);
        } else {
          setNameCooldownMessage("");
        }

        setOtpVerified(true);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("");
        setOtpMessageIsError(false);
        setEmailOtpVerified(true);
        setEmailOtpSent(false);
        setEmailOtpCode("");
        setEmailOtpMessage("");
        setEmailOtpMessageIsError(false);
        setOldMobileVerified(false);

        const mobileVerifiedObj = data.mobile_change_verified || {};
        const verifiedMobile = mobileVerifiedObj.mobile || "";
        const verifiedAt = mobileVerifiedObj.verified_at ? new Date(mobileVerifiedObj.verified_at) : null;
        let hasMobileVerified = false;

        if (verifiedAt && data.mobile) {
          try {
            const normalizedCurrentMobile = normalizePhone(data.mobile || "");
            const normalizedVerifiedMobile = normalizePhone(verifiedMobile);
            hasMobileVerified = normalizedCurrentMobile === normalizedVerifiedMobile;
          } catch {
            hasMobileVerified = false;
          }
        }

        setIsMobileVerified(hasMobileVerified);

        // Set avatar with fallback logic
        const avatarUrl = data.image_name && 
          data.image_name.trim() !== "" && 
          !data.image_name.includes("default") &&
          !data.image_name.includes("placeholder") &&
          !data.image_name.startsWith("blob:")  // ✅ Filter out blob URLs
            ? data.image_name
            : getGenderFallback(data.gender, data.image_name);
        setAvatarPreview(avatarUrl);
        
        // Set cover with fallback to hero banner
        const coverUrl = data.cover_image && 
          data.cover_image.trim() !== "" &&
          !data.cover_image.includes("default") &&
          !data.cover_image.includes("placeholder") &&
          !data.cover_image.startsWith("blob:")  // ✅ Filter out blob URLs
            ? data.cover_image
            : heroBanner;
        setCoverPreview(coverUrl);

        setLoading(false);
      } catch (error) {
        console.error("Failed to load profile:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 🔹 INPUT CHANGE
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const nextValue = name === "phone" ? normalizePhoneInput(value) : value;
    setFormData({ ...formData, [name]: nextValue });

    if (name === "username") {
      const usernameChanged = value.trim() !== (initialUsernameRef.current || "").trim();
      setUsernameStatus("idle");
      setUsernameMessage("");
      if (!usernameChanged) {
        setUsernameStatus("available");
        setUsernameMessage("This is your current username");
      }
    }

    if (name === "email") {
      const emailChanged = (value || "").trim().toLowerCase() !== (initialEmailRef.current || "").trim().toLowerCase();
      if (emailChanged && (value || "").trim()) {
        setEmailOtpVerified(false);
        setEmailOtpSent(false);
        setEmailOtpCode("");
        setEmailOtpMessage("Verify this email with OTP before saving.");
        setEmailOtpMessageIsError(false);
      } else {
        setEmailOtpVerified(true);
        setEmailOtpSent(false);
        setEmailOtpCode("");
        setEmailOtpMessage("");
        setEmailOtpMessageIsError(false);
      }
    }

    if (name === "name") {
      const nameChanged = value.trim() !== (initialNameRef.current || "").trim();
      if (nameChanged && fullNameCooldownDays > 0) {
        setNameCooldownMessage(`You can change full name again in ${fullNameCooldownDays} day(s)`);
      } else {
        setNameCooldownMessage("");
      }

      const phoneChanged = normalizePhone(formData.phone) !== normalizePhone(initialPhoneRef.current);
      if (nameChanged && fullNameCooldownDays <= 0 && !phoneChanged) {
        setOtpVerified(false);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("Verify OTP before changing full name");
        setOtpMessageIsError(false);
      }
      if (!nameChanged && !phoneChanged) {
        setOtpVerified(true);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("");
        setOtpMessageIsError(false);
      }
    }

    if (name === "phone") {
      const changed = normalizePhone(nextValue) !== normalizePhone(initialPhoneRef.current);
      if (changed) {
        setIsMobileVerified(false);
        setOldMobileVerified(false);
        setOtpVerified(false);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("Verify your current number first before changing it.");
        setOtpMessageIsError(false);
        setOtpTargetMobile(null);
      } else {
        setOtpVerified(true);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("");
        setOtpMessageIsError(false);
        setOldMobileVerified(false);
        setOtpTargetMobile(null);
      }
    }

    if (name === "publicId") {
      const changed = (nextValue || "").trim().toLowerCase() !== (initialPublicIdRef.current || "").trim().toLowerCase();
      if (changed) {
        setOtpVerified(false);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("Verify mobile number with OTP before saving public ID changes");
        setOtpMessageIsError(false);
      } else {
        setOtpVerified(true);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("");
        setOtpMessageIsError(false);
      }
    }

    // If the user switches gender and there is no uploaded image, adjust fallback
    if (name === "gender" && (!avatarPreview || avatarPreview === getGenderFallback(formData.gender))) {
      setAvatarPreview(getGenderFallback(value));
    }
  };

  const handleGenderSelect = (value: string) => {
    const currentFallback = getGenderFallback(formData.gender);
    setFormData({ ...formData, gender: value });
    if (!avatarPreview || avatarPreview === currentFallback) {
      setAvatarPreview(getGenderFallback(value));
    }
    setGenderOpen(false);
  };

  const getUsernameUi = () => {
    if (usernameStatus === "taken" || usernameStatus === "error") {
      return {
        inputClassName: "border-red-500 focus:ring-red-500/50 focus:border-red-500",
        helperClassName: "text-red-500",
      };
    }

    if (usernameStatus === "available") {
      return {
        inputClassName: "border-orange-500 focus:ring-orange-500/50 focus:border-orange-500",
        helperClassName: "text-orange-500",
      };
    }

    return {
      inputClassName: "",
      helperClassName: "text-muted-foreground",
    };
  };

  useEffect(() => {
    const raw = formData.username || "";
    const candidate = raw.trim();

    if (!candidate) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    if (candidate.toLowerCase() === initialUsernameRef.current.toLowerCase()) {
      setUsernameStatus("available");
      setUsernameMessage("This is your current username");
      return;
    }

    const requestId = ++usernameRequestIdRef.current;
    setUsernameStatus("checking");
    setUsernameMessage("Checking availability...");

    const timer = setTimeout(async () => {
      const user = auth.currentUser;
      if (!user) {
        setUsernameStatus("error");
        setUsernameMessage("Please login again");
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `${API_BASE}/profile/username-availability?username=${encodeURIComponent(candidate)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (requestId !== usernameRequestIdRef.current) return;

        if (!res.ok) {
          setUsernameStatus("error");
          setUsernameMessage("Unable to verify username");
          return;
        }

        const data = await res.json();
        if (data.available) {
          setUsernameStatus("available");
          setUsernameMessage("Username is available");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage(data.reason || "Username already used");
        }
      } catch (error) {
        if (requestId !== usernameRequestIdRef.current) return;
        console.error("Username availability check failed", error);
        setUsernameStatus("error");
        setUsernameMessage("Unable to verify username");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.username]);

  const sendOtp = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    if (!requiresOtp) {
      toast({ title: "OTP not required", description: "Change full name or mobile number to request OTP verification." });
      return;
    }

    const desiredMobile = normalizePhone(formData.phone);
    const currentMobile = normalizePhone(initialPhoneRef.current || "");
    const targetMobile = isPhoneChanged && currentMobile && !oldMobileVerified ? currentMobile : desiredMobile;

    if (targetMobile.length !== 10) {
      setOtpMessage("Please enter a valid 10-digit mobile number.");
      setOtpMessageIsError(true);
      toast({ title: "Invalid mobile number", description: "Enter exactly 10 digits.", variant: "destructive" });
      return;
    }

    try {
      setSendingOtp(true);
      setOtpMessage("");
      setOtpMessageIsError(false);
      const token = await user.getIdToken();
      const forceSend = isPhoneChanged || (isNameChanged && !isPhoneChanged);
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobile: targetMobile,
          force_send: forceSend,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const isLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      if (!res.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : data?.detail?.message || "Failed to send OTP";
        setOtpMessage(detail);
        setOtpMessageIsError(true);
        toast({ title: "OTP send failed", description: detail, variant: "destructive" });
        return;
      }

      setOtpTargetMobile(targetMobile);
      if (data.already_verified) {
        setOtpVerified(true);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("Mobile number is unchanged. OTP verification is not required.");
        setOtpMessageIsError(false);
      } else {
        setOtpVerified(false);
        setOtpSent(true);
        const expirySeconds = Number(data.expires_in_seconds || 0);
        const expiryMinutes = expirySeconds > 0 ? Math.max(1, Math.ceil(expirySeconds / 60)) : 2;
        setOtpMessage(`OTP SMS sent to ${targetMobile}. It expires in ${expiryMinutes} minutes.`);
        setOtpMessageIsError(false);
      }

      const isDevFallback = isLocalhost && data?.dev_mode && typeof data?.otp === "string";
      if (isDevFallback) {
        console.warn("[DEV OTP] OTP is available in development only", data.otp);
      }

      toast({
        title: "OTP requested",
        description: isDevFallback
          ? "OTP request completed in development mode. An SMS should be delivered to your mobile number."
          : data.message || "OTP SMS sent to your mobile number.",
      });
    } catch (error) {
      setOtpMessage("Failed to send OTP");
      setOtpMessageIsError(true);
      toast({ title: "OTP send failed", description: String(error), variant: "destructive" });
    } finally {
      setSendingOtp(false);
    }
  };

  const sendEmailOtp = async () => {
    const email = (formData.email || "").trim().toLowerCase();
    if (!email) {
      setEmailOtpMessage("Enter a valid email to send verification OTP.");
      setEmailOtpMessageIsError(true);
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }

    if (!isEmailChanged) {
      setEmailOtpVerified(true);
      setEmailOtpMessage("Email is unchanged and already verified.");
      setEmailOtpMessageIsError(false);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    try {
      setEmailSendingOtp(true);
      setEmailOtpMessage("");
      setEmailOtpMessageIsError(false);

      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/profile/send-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : data?.detail?.message || "Failed to send email OTP";
        setEmailOtpMessage(detail);
        setEmailOtpMessageIsError(true);
        toast({ title: "Email OTP failed", description: detail, variant: "destructive" });
        return;
      }

      const expiresMinutes = Number(data.expires_in_minutes || Math.ceil(Number(data.expires_in_seconds || 0) / 60) || 0);
      setEmailOtpSent(true);
      setEmailOtpVerified(false);
      setEmailOtpMessage(`OTP sent to ${email}. It expires in ${Math.max(1, expiresMinutes)} minutes.`);
      setEmailOtpMessageIsError(false);
      toast({ title: "Email OTP sent", description: data.message || "OTP sent to your email." });
    } catch (error) {
      setEmailOtpMessage("Failed to send email OTP");
      setEmailOtpMessageIsError(true);
      toast({ title: "Email OTP failed", description: String(error), variant: "destructive" });
    } finally {
      setEmailSendingOtp(false);
    }
  };

  const verifyEmailOtp = async () => {
    const email = (formData.email || "").trim().toLowerCase();
    if (!email) {
      setEmailOtpMessage("Enter a valid email to verify OTP.");
      setEmailOtpMessageIsError(true);
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }

    if (emailOtpCode.trim().length !== 6) {
      toast({ title: "Enter valid OTP", description: "OTP must be 6 digits", variant: "destructive" });
      return;
    }

    try {
      setEmailVerifyingOtp(true);
      const user = auth.currentUser;
      if (!user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/profile/verify-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, otp: emailOtpCode.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : data?.detail?.message || "Email OTP verification failed";
        setEmailOtpVerified(false);
        setEmailOtpMessage(detail);
        setEmailOtpMessageIsError(true);
        toast({ title: "Verification failed", description: detail, variant: "destructive" });
        return;
      }

      setEmailOtpVerified(true);
      setEmailOtpSent(false);
      setEmailOtpCode("");
      setEmailOtpMessage("Email verified successfully.");
      setEmailOtpMessageIsError(false);
      toast({ title: "Email verified", description: data.message || "Your email has been verified." });
    } catch (error) {
      setEmailOtpVerified(false);
      setEmailOtpMessage("Email OTP verification failed");
      setEmailOtpMessageIsError(true);
      toast({ title: "Verification failed", description: String(error), variant: "destructive" });
    } finally {
      setEmailVerifyingOtp(false);
    }
  };

  const verifyOtp = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    if (otpCode.trim().length !== 6) {
      toast({ title: "Enter valid OTP", description: "OTP must be 6 digits", variant: "destructive" });
      return;
    }

    try {
      setVerifyingOtp(true);
      const token = await user.getIdToken();
      const bodyMobile = otpTargetMobile || normalizePhone(formData.phone);
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mobile: bodyMobile, otp: otpCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof data?.detail === "string" ? data.detail : data?.detail?.message || "OTP verification failed";
        setOtpVerified(false);
        setOtpMessage(detail);
        setOtpMessageIsError(true);
        toast({ title: "OTP verification failed", description: detail, variant: "destructive" });
        return;
      }

      const verifiedMobile = bodyMobile;
      const currentMobile = normalizePhone(initialPhoneRef.current || "");
      if (isPhoneChanged && currentMobile && verifiedMobile === currentMobile && !oldMobileVerified) {
        setOldMobileVerified(true);
        setOtpTargetMobile(null);
        setOtpSent(false);
        setOtpCode("");
        setOtpVerified(false);
        setOtpMessage("Old number verified. Now send OTP to the new number to complete the change.");
        setOtpMessageIsError(false);
        toast({ title: "Current number verified", description: "Now verify the new number before saving." });
      } else {
        setOtpVerified(true);
        setIsMobileVerified(true);
        setOldMobileVerified(false);
        setOtpTargetMobile(null);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("Mobile number verified and saved. You can now save other profile changes.");
        setOtpMessageIsError(false);
        toast({ title: "OTP verified", description: data.message || "Mobile verified successfully" });
      }
    } catch (error) {
      setOtpVerified(false);
      setOtpMessage("OTP verification failed");
      setOtpMessageIsError(true);
      toast({ title: "OTP verification failed", description: String(error), variant: "destructive" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 🔹 UPLOAD IMAGE (R2)
  const uploadImage = async (
    file: File,
    type: "profile-image" | "cover-image"
  ) => {
    // Try JWT auth first (new system), then Firebase (legacy)
    let token = localStorage.getItem("access_token");
    
    if (!token) {
      const user = auth.currentUser;
      if (!user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return null;
      }
      token = await user.getIdToken();
    }

    const form = new FormData();
    form.append("file", file);

    try {
      console.log(`📤 Uploading ${type}:`, { filename: file.name, size: file.size });
      
      const res = await fetch(`${API_BASE}/upload/${type}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`❌ Upload failed:`, { status: res.status, error: err });
        toast({ title: "Upload failed", description: err.detail || "Server error", variant: "destructive" });
        return null;
      }

      const data = await res.json();
      console.log(`✅ Upload successful:`, { image_url: data.image_url });
      
      if (!data?.image_url) {
        toast({ title: "Upload failed", description: "Invalid server response", variant: "destructive" });
        return null;
      }
      return data.image_url as string;
    } catch (error) {
      console.error(`❌ Upload error:`, error);
      toast({ title: "Upload error", description: String(error), variant: "destructive" });
      return null;
    }
  };

  // 🔹 AVATAR SELECT
  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    // Show crop modal
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropSrc(event.target?.result as string);
      setCropFile(file);
      setCropType("profile");
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setShowCropModal(true);
      setShowAvatarSheet(false);
    };
    reader.readAsDataURL(file);
  };

  // 🔹 CAMERA FLOW
  const stopCameraStream = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ title: "Camera not supported", description: "Browser does not support camera capture. Opening gallery instead.", variant: "destructive" });
      cameraInputRef.current?.click();
      return;
    }

    setCameraError("");
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setCameraStream(stream);
      setShowCameraModal(true);
      setShowAvatarSheet(false);

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }
    } catch (error: any) {
      const message = error?.name === "NotAllowedError" ? "Camera permission denied" : "Unable to access camera";
      setCameraError(message);
      toast({ title: message, description: "You can still upload from gallery.", variant: "destructive" });
      cameraInputRef.current?.click();
    } finally {
      setCameraLoading(false);
    }
  };

  const handleCameraCapture = async () => {
    if (!cameraVideoRef.current || !cameraCaptureCanvasRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = cameraCaptureCanvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "camera.png", { type: "image/png" });
      setCropFile(file);
      setCropSrc(dataUrl);
      setCropType("profile");
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setShowCropModal(true);
      setShowCameraModal(false);
      stopCameraStream();
    } catch (error) {
      console.error("Failed to capture photo", error);
      toast({ title: "Capture failed", description: "Please try again", variant: "destructive" });
    }
  };

  // 🔹 COVER SELECT
  const handleCoverSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    // Show crop modal for cover
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropSrc(event.target?.result as string);
      setCropFile(file);
      setCropType("cover");
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setShowCropModal(true);
      setShowCoverSheet(false);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // 🔹 CROP AND SAVE IMAGE
  const handleCropSave = async () => {
    if (!cropSrc || !croppedAreaPixels) return;

    const canvas = cropCanvasRef.current;
    if (!canvas) return;

    setUploadingImage(true);

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = cropSrc;

    image.onload = async () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let canvasWidth = 400;
      let canvasHeight = 400;
      let type: "profile-image" | "cover-image" = "profile-image";

      if (cropType === "cover") {
        canvasWidth = 800;
        canvasHeight = 300;
        type = "cover-image";
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        canvasWidth,
        canvasHeight
      );

      // For circular profile images, add circular mask
      if (cropType === "profile") {
        const imageData = ctx.getImageData(0, 0, 400, 400);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const pixelIndex = i / 4;
          const x = pixelIndex % 400;
          const y = Math.floor(pixelIndex / 400);
          const dx = x - 200;
          const dy = y - 200;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 200) {
            data[i + 3] = 0; // Set alpha to 0 for pixels outside circle
          }
        }

        ctx.putImageData(imageData, 0, 0);
      }

      // Convert canvas to blob and upload
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const filename = cropType === "profile" ? "avatar.png" : "cover.png";
        const croppedFile = new File([blob], filename, { type: "image/png" });

        const preview = URL.createObjectURL(blob);
        if (cropType === "profile") {
          setAvatarPreview(preview);
        } else {
          setCoverPreview(preview);
        }

        const uploadedUrl = await uploadImage(croppedFile, type);
        if (uploadedUrl) {
          const cacheUrl = `${uploadedUrl}?t=${Date.now()}`;
          if (cropType === "profile") {
            setAvatarPreview(cacheUrl);
          } else {
            setCoverPreview(cacheUrl);
          }

          // 🔹 SAVE TO DATABASE IMMEDIATELY (skip notification)
          let token = localStorage.getItem("access_token");
          if (!token) {
            const user = auth.currentUser;
            if (user) {
              token = await user.getIdToken();
            }
          }

          if (token) {
            try {
              const updatePayload = cropType === "profile" 
                ? { image_name: uploadedUrl, skip_notification: true }
                : { cover_image: uploadedUrl, skip_notification: true };
              
              console.log(`📤 Saving ${cropType} to database:`, updatePayload);
              
              const updateRes = await fetch(`${API_BASE}/profile/update`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updatePayload),
              });
              
              if (updateRes.ok) {
                console.log(`✅ ${cropType} saved to database successfully`);
              } else {
                const errorData = await updateRes.json().catch(() => ({}));
                console.error(`❌ Failed to save ${cropType} to database:`, {
                  status: updateRes.status,
                  statusText: updateRes.statusText,
                  error: errorData
                });
                toast({ title: `Image uploaded but failed to save to profile`, description: errorData.detail || "Database save failed", variant: "destructive" });
              }
            } catch (error) {
              console.error("❌ Error saving image to database:", error);
              toast({ title: "Image uploaded but failed to save to profile", description: String(error), variant: "destructive" });
            }
          }
        } else {
          toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
        }

        setShowCropModal(false);
        setUploadingImage(false);
        setShowAvatarSheet(false);
        setShowCoverSheet(false);
        toast({ title: `${cropType === "profile" ? "Photo" : "Cover"} updated successfully` });
      }, "image/png");
    };

    image.onerror = () => {
      setUploadingImage(false);
      toast({ title: "Failed to process image", variant: "destructive" });
    };
  };

  // 🔹 COVER SELECT
  const handleCoverChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    setCoverPreview(URL.createObjectURL(file));
    await uploadImage(file, "cover-image");
  };

  // 🔹 REMOVE AVATAR (reset to gender/default icon)
  const handleRemoveAvatar = async () => {
    let token = localStorage.getItem("access_token");
    if (!token) {
      const user = auth.currentUser;
      if (!user) return;
      token = await user.getIdToken();
    }

    try {
      const res = await fetch(`${API_BASE}/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_name: null, skip_notification: true }),
      });

      if (res.ok) {
        const fallback = getGenderFallback(formData.gender);
        setAvatarPreview(fallback);
        toast({ title: "Profile photo removed" });
      } else {
        toast({ title: "Failed to remove photo", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to remove avatar", error);
      toast({ title: "Failed to remove photo", variant: "destructive" });
    } finally {
      setShowAvatarSheet(false);
    }
  };

  // 🔹 REMOVE COVER
  const handleRemoveCover = async () => {
    let token = localStorage.getItem("access_token");
    if (!token) {
      const user = auth.currentUser;
      if (!user) return;
      token = await user.getIdToken();
    }

    try {
      const res = await fetch(`${API_BASE}/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cover_image: null, skip_notification: true }),
      });

      if (res.ok) {
        setCoverPreview(null);
        toast({ title: "Cover photo removed" });
      } else {
        toast({ title: "Failed to remove cover", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to remove cover", error);
      toast({ title: "Error removing cover", variant: "destructive" });
    } finally {
      setShowCoverSheet(false);
    }
  };

  // 🔹 SAVE PROFILE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let token = localStorage.getItem("access_token");
    if (!token) {
      const user = auth.currentUser;
      if (!user) return;
      token = await user.getIdToken();
    }

    setSaving(true);

    const trimmedUsername = (formData.username || "").trim();
    if (!trimmedUsername) {
      setSaving(false);
      setUsernameStatus("error");
      setUsernameMessage("Username is required");
      return;
    }

    if (usernameStatus === "checking") {
      setSaving(false);
      return;
    }

    if (usernameStatus === "taken" || usernameStatus === "error") {
      setSaving(false);
      return;
    }

    if (isNameChangeBlocked) {
      setSaving(false);
      toast({
        title: "Name change not allowed yet",
        description: `You can change full name again in ${fullNameCooldownDays} day(s)`,
        variant: "destructive",
      });
      return;
    }

    if ((requiresOtp && !otpVerified) || (requiresEmailOtp && !emailOtpVerified)) {
      setSaving(false);
      toast({
        title: "Verify OTP first",
        description: requiresEmailOtp && !emailOtpVerified
          ? "Please verify email OTP before saving the new email."
          : "Please verify mobile OTP before changing full name or mobile.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build update payload - include image URLs if they exist
      const updatePayload: any = {
        full_name: formData.name?.trim(),
        username: trimmedUsername,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        mobile: formData.phone,
        dob: formData.dob || null,
        gender: formData.gender,
      };

      if ((formData.email || "").trim()) {
        updatePayload.email = (formData.email || "").trim().toLowerCase();
      }

      if ((formData.publicId || "").trim()) {
        updatePayload.public_id = (formData.publicId || "").trim();
      }

      // Only include images if they are actual URLs (not fallback icons or blob URLs)
      if (avatarPreview && 
          !avatarPreview.includes('maleicon') && 
          !avatarPreview.includes('femaleicon') && 
          !avatarPreview.includes('profileicon') &&
          !avatarPreview.includes('avatar-2') &&
          !avatarPreview.startsWith('blob:')) {  // ✅ Never save blob URLs
        // Remove cache-busting query param before saving
        const cleanUrl = avatarPreview.split('?')[0];
        updatePayload.image_name = cleanUrl;
      }

      if (coverPreview && 
          !coverPreview.includes('hero-banner') &&
          !coverPreview.startsWith('blob:')) {  // ✅ Never save blob URLs
        // Remove cache-busting query param before saving
        const cleanUrl = coverPreview.split('?')[0];
        updatePayload.cover_image = cleanUrl;
      }

      const response = await fetch(`${API_BASE}/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        initialNameRef.current = (formData.name || "").trim();
        initialPhoneRef.current = formData.phone || "";
        setOtpVerified(true);
        setOtpSent(false);
        setOtpCode("");
        setOtpMessage("");
        setOtpMessageIsError(false);
        toast({
          title: "Profile updated",
          description: "Your profile has been saved successfully",
        });
        navigate("/profile");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData?.detail;

        if (response.status === 403 && detail?.code === "FULL_NAME_COOLDOWN") {
          const remaining = Number(detail.remaining_days || 1);
          setFullNameCooldownDays(remaining);
          setNameCooldownMessage(`You can change full name again in ${remaining} day(s)`);
        }

        if (
          response.status === 400 &&
          (
            detail?.code === "MOBILE_OTP_REQUIRED" ||
            detail?.code === "MOBILE_OTP_EXPIRED"
          )
        ) {
          setOtpMessageIsError(false);
        }

        if (response.status === 409) {
          setUsernameStatus("taken");
          setUsernameMessage(errorData.detail || "Username already used");
        } else if (
          response.status === 400 &&
          typeof errorData.detail === "string" &&
          errorData.detail.toLowerCase().includes("username")
        ) {
          setUsernameStatus("error");
          setUsernameMessage(errorData.detail || "Invalid username format");
        }
        toast({
          title: "Error",
          description:
            typeof detail === "string"
              ? detail
              : detail?.message || errorData.detail || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Something went wrong while updating your profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // 🔹 DETECT CURRENT LOCATION
  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast({ 
        title: "Geolocation not supported", 
        description: "Your browser doesn't support location detection", 
        variant: "destructive",
        duration: 2000 
      });
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use BigDataCloud API (free, CORS-enabled, no API key needed)
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            // Format location: City, State/Region, Country
            const locationParts = [];
            if (data.city || data.locality) {
              locationParts.push(data.city || data.locality);
            }
            if (data.principalSubdivision) {
              locationParts.push(data.principalSubdivision);
            }
            if (data.countryName) {
              locationParts.push(data.countryName);
            }
            
            const detectedLocation = locationParts.join(", ") || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setFormData((prev) => ({ ...prev, location: detectedLocation }));
            toast({ 
              title: "📍 Location detected", 
              description: detectedLocation,
              duration: 2000 
            });
          } else {
            throw new Error("Geocoding failed");
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          // Fallback to coordinates
          const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setFormData((prev) => ({ ...prev, location: coords }));
          toast({ 
            title: "📍 Location detected", 
            description: "Using coordinates",
            duration: 2000 
          });
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setDetectingLocation(false);
        const message = error.code === 1 
          ? "Location permission denied" 
          : error.code === 3
          ? "Location detection timeout"
          : "Unable to detect location";
        toast({ 
          title: message, 
          description: "Please enter manually", 
          variant: "destructive",
          duration: 2000 
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    return () => stopCameraStream();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!genderDropdownRef.current) return;
      if (!genderDropdownRef.current.contains(event.target as Node)) {
        setGenderOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ensure stream attaches once modal renders
  useEffect(() => {
    if (!showCameraModal || !cameraStream || !cameraVideoRef.current) return;
    cameraVideoRef.current.srcObject = cameraStream;
    cameraVideoRef.current
      .play()
      .catch((err) => console.error("Video play failed", err));
  }, [showCameraModal, cameraStream]);

  if (loading) {
    return (
      <MainLayout showRightSidebar={true}>
        <div className="flex justify-center items-center h-96">
          Loading profile...
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-2xl mx-auto overflow-x-hidden">
       
          <div className="flex items-center gap-3 mb-4 mt-4 ml-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-xl font-display font-bold">Edit Profile</h1>
            <button
              type="submit"
              form="edit-profile-form"
              disabled={isSaveDisabled}
              className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-semibold flex items-center gap-2 shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

        {/* Cover */}
        <div className="relative h-32 sm:h-48 rounded-xl overflow-hidden">
          <img
            src={coverPreview || heroBanner}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center z-10">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCoverSheet(true);
              }}
              className="p-3 bg-background/80 rounded-full hover:bg-background transition-all shadow-lg active:scale-95 z-20 pointer-events-auto"
            >
              <Camera className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Avatar */}
        <div className="relative px-4 -mt-16 z-30">
          <div className="relative w-28 h-28">
            <img
              src={avatarPreview || avatar2}
              className="w-full h-full rounded-full object-cover border-4 border-background"
            />
            <button
              onClick={() => setShowAvatarSheet(true)}
              className="absolute bottom-0 right-0 p-2 bg-primary text-gray-900 dark:text-white rounded-full"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              hidden
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              hidden
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                if (!e.target.files?.[0]) return;
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                  setCropSrc(event.target?.result as string);
                  setCropFile(file);
                  setCropType("profile");
                  setZoom(1);
                  setCrop({ x: 0, y: 0 });
                  setShowCropModal(true);
                  setShowAvatarSheet(false);
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
        </div>

        {/* Avatar action sheet - Bottom on mobile, centered dialog on desktop */}
        {showAvatarSheet && (
          <div 
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAvatarSheet(false);
              }
            }}
          >
            <div className="w-full md:max-w-md bg-background md:rounded-2xl rounded-t-3xl p-6 space-y-3 animate-in fade-in slide-in-from-bottom-8 md:zoom-in-95 duration-300 shadow-2xl border-t-4 border-primary/20">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Profile photo</p>
                <button onClick={() => setShowAvatarSheet(false)} className="p-2 hover:bg-muted rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                className="w-full py-3 rounded-xl bg-muted hover:bg-muted/70 text-sm font-medium transition-all"
                onClick={() => avatarInputRef.current?.click()}
              >
                Choose from gallery
              </button>
              <button
                className="w-full py-3 rounded-xl bg-muted hover:bg-muted/70 text-sm font-medium transition-all"
                onClick={openCamera}
              >
                Take photo
              </button>
              <button
                className="w-full py-3 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-all"
                onClick={handleRemoveAvatar}
              >
                Remove current picture
              </button>
            </div>
          </div>
        )}

        {/* Cover action sheet - Bottom on mobile, centered dialog on desktop */}
        {showCoverSheet && (
          <div 
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCoverSheet(false);
              }
            }}
          >
            <div className="w-full md:max-w-md bg-background md:rounded-2xl rounded-t-3xl p-6 space-y-3 animate-in fade-in slide-in-from-bottom-8 md:zoom-in-95 duration-300 shadow-2xl border-t-4 border-primary/20">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Cover photo</p>
                <button onClick={() => setShowCoverSheet(false)} className="p-2 hover:bg-muted rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                className="w-full py-3 rounded-xl bg-muted hover:bg-muted/70 text-sm font-medium transition-all"
                onClick={() => {
                  setShowCoverSheet(false);
                  coverInputRef.current?.click();
                }}
              >
                Choose from gallery
              </button>
              <button
                className="w-full py-3 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-all"
                onClick={handleRemoveCover}
              >
                Remove current picture
              </button>
            </div>
          </div>
        )}
        
        <input
          ref={coverInputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={handleCoverSelect}
        />

        {showCameraModal && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                stopCameraStream();
                setShowCameraModal(false);
              }
            }}
          >
            <div className="w-full max-w-2xl bg-background rounded-2xl shadow-2xl p-4 md:p-6 space-y-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold flex items-center gap-2"><Camera className="w-5 h-5 text-primary" />Take photo</p>
                  {cameraError && <p className="text-xs text-destructive mt-1">{cameraError}</p>}
                </div>
                <button
                  onClick={() => {
                    stopCameraStream();
                    setShowCameraModal(false);
                  }}
                  className="p-2 hover:bg-muted rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative bg-muted/40 rounded-xl overflow-hidden aspect-[3/4] md:aspect-video max-h-[70vh]">
                <video
                  ref={cameraVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {cameraLoading && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                    <RotateCw className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
              </div>

              <canvas ref={cameraCaptureCanvasRef} hidden />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    stopCameraStream();
                    setShowCameraModal(false);
                  }}
                  className="flex-1 py-3 rounded-xl border-2 border-border hover:bg-muted text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCameraCapture}
                  disabled={cameraLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground hover:shadow-lg hover:shadow-primary/30 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {cameraLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Opening camera...
                    </>
                  ) : (
                    "Capture"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Professional Crop Modal with Animations */}
        {showCropModal && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget && !uploadingImage) setShowCropModal(false);
            }}
          >
            <div className="w-full max-w-2xl bg-background rounded-2xl shadow-2xl p-4 md:p-6 space-y-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Crop {cropType === "profile" ? "Profile Photo" : "Cover Image"}
                </h2>
                <button 
                  onClick={() => !uploadingImage && setShowCropModal(false)} 
                  disabled={uploadingImage}
                  className="p-2 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* React Easy Crop Component with Loading Overlay */}
              <div className={`relative bg-gradient-to-br from-muted/50 to-muted rounded-xl overflow-hidden ${cropType === "profile" ? "h-96" : "h-64"}`}>
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={cropType === "profile" ? 1 : 800 / 300}
                  cropShape={cropType === "profile" ? "round" : "rect"}
                  showGrid={true}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  objectFit="horizontal-cover"
                />
                
                {uploadingImage && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                    <RotateCw className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm font-medium text-foreground">Uploading image...</p>
                  </div>
                )}
              </div>

              {/* Zoom Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Zoom</label>
                  <span className="text-xs text-muted-foreground">{zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  disabled={uploadingImage}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary 
                    [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all 
                    [&::-webkit-slider-thumb]:hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <canvas ref={cropCanvasRef} hidden />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCropModal(false)}
                  disabled={uploadingImage}
                  className="flex-1 py-3 rounded-xl border-2 border-border hover:bg-muted text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropSave}
                  disabled={uploadingImage}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground hover:shadow-lg hover:shadow-primary/30 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Save & Upload"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FORM */}
        <form id="edit-profile-form" onSubmit={handleSubmit} className="px-2 md:px-4 py-6 space-y-5">
          {/* NAME (READ ONLY) */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Full Name</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-muted-foreground group-hover:text-primary">
                <User className="w-5 h-5" />
              </span>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full pl-12 pr-36 py-3 rounded-xl text-sm placeholder:text-muted-foreground transition-all bg-muted/50 border border-border hover:bg-muted/70 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>
            {isNameChangeBlocked ? (
              <p className="mt-1 text-xs text-red-500">{nameCooldownMessage}</p>
            ) : nameCooldownMessage ? (
              <p className="mt-1 text-xs text-muted-foreground">{nameCooldownMessage}</p>
            ) : null}
          </div>
          {(() => {
            const usernameUi = getUsernameUi();
            const usernameHelp = isUsernameChanged && !otpVerified
              ? "First verify mobile OTP before saving username changes"
              : usernameMessage;
            const usernameHelpClass = isUsernameChanged && !otpVerified
              ? "text-orange-400"
              : usernameUi.helperClassName;
            return (
              <div>
                <Input
                  label="Username"
                  name="username"
                  icon={<AtSign className="w-5 h-5" />}
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  inputClassName={usernameUi.inputClassName}
                  helperText={usernameHelp}
                  helperClassName={usernameHelpClass}
                />
                {isUsernameChanged ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Username changes are allowed without mobile OTP verification.
                  </p>
                ) : null}
              </div>
            );
          })()}

          <Input
            label="Profile Code (Public ID)"
            name="publicId"
            icon={<BadgeCheck className="w-5 h-5" />}
            value={formData.publicId}
            disabled
            readOnly
            placeholder="k0001"
            helperText="Auto-generated, non-editable "
            helperClassName="text-muted-foreground"
          />

          {/* GENDER */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Gender</label>
            <div ref={genderDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setGenderOpen((open) => !open)}
                className="w-full pl-12 pr-10 py-3 rounded-xl text-sm bg-background/80 border-2 border-border hover:bg-background hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all cursor-pointer font-medium text-foreground text-left"
              >
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Users className="w-5 h-5" />
                </span>
                {formData.gender === "male"
                  ? "Male"
                  : formData.gender === "female"
                    ? "Female"
                    : "Select your gender"}
                <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <ChevronDown className={`w-5 h-5 transition-transform ${genderOpen ? "rotate-180" : ""}`} />
                </span>
              </button>

              {genderOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-card/95 backdrop-blur shadow-xl overflow-hidden">
                  {[
                    { value: "", label: "Select your gender" },
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleGenderSelect(option.value)}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        formData.gender === option.value
                          ? "bg-orange-500/20 text-orange-200"
                          : "text-foreground hover:bg-orange-500/10"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Email</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-muted-foreground">
                <Mail className="w-5 h-5" />
              </span>
              <input
                name="email"
                value={formData.email}
                readOnly
                disabled
                type="email"
                placeholder="Enter your email"
                className="w-full pl-12 pr-4 py-3 rounded-xl text-sm placeholder:text-muted-foreground transition-all bg-muted/30 border border-border/60 text-muted-foreground cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your email is fixed to the value used at signup.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Phone</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-muted-foreground">
                <Phone className="w-5 h-5" />
              </span>
              <input
                name="phone"
                value={formData.phone}
                readOnly
                disabled
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="Enter your phone number"
                className="w-full pl-12 pr-4 py-3 rounded-xl text-sm placeholder:text-muted-foreground transition-all bg-muted/30 border border-border/60 text-muted-foreground cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your phone number is locked to your account and cannot be changed here.
            </p>
          </div>
          <Input
            label="Date of Birth"
            name="dob"
            type="date"
            icon={<Calendar className="w-5 h-5" />}
            value={formData.dob}
            onChange={handleChange}
          />
          {/* Location with auto-detect */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Location</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-muted-foreground group-hover:text-primary">
                <MapPin className="w-5 h-5" />
              </span>
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter your location"
                className="w-full pl-12 pr-12 py-3 rounded-xl text-sm placeholder:text-muted-foreground transition-all bg-muted/50 border border-border hover:bg-muted/70 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
              <button
                type="button"
                onClick={detectLocation}
                disabled={detectingLocation}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Detect current location"
              >
                {detectingLocation ? (
                  <RotateCw className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Crosshair className="w-4 h-4 text-muted-foreground hover:text-primary" />
                )}
              </button>
            </div>
          </div>
          <Input
            label="Website"
            name="website"
            icon={<LinkIcon className="w-5 h-5" />}
            value={formData.website}
            onChange={handleChange}
            placeholder="https://yourwebsite.com"
          />

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Bio</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-5 h-5 text-muted-foreground pointer-events-none" />
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none hover:bg-muted/70"
              />
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

const Input = ({ label, icon, disabled, inputClassName = "", helperText = "", helperClassName = "text-muted-foreground", ...props }: any) => (
  <div>
    <label className="block text-sm font-medium mb-2 text-foreground">{label}</label>
    <div className="relative group">
      <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
        disabled ? "text-muted-foreground/50" : "text-muted-foreground group-hover:text-primary"
      }`}>
        {icon}
      </span>
      <input
        disabled={disabled}
        {...props}
        className={`w-full pl-12 pr-4 py-3 rounded-xl text-sm placeholder:text-muted-foreground transition-all
          ${disabled 
            ? "bg-muted/30 text-muted-foreground cursor-not-allowed border border-border/50" 
            : "bg-muted/50 border border-border hover:bg-muted/70 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
          } ${inputClassName}
        `}
      />
    </div>
    {helperText ? <p className={`mt-1 text-xs ${helperClassName}`}>{helperText}</p> : null}
  </div>
);

export default EditProfile;
