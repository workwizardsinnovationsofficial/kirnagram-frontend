import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader, CheckCircle, ArrowLeft } from "lucide-react";
import kirnagramLogoText from "@/assets/kirnagram@2.png";
import heroBanner from "@/assets/hero-banner.jpg";
import { useToast } from "@/hooks/use-toast";
import { getGoogleAuthProfile, setAuthSession } from "@/firebase";

const API_BASE = "https://api.kirnagram.com";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.53Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.24-2.5c-.9.6-2.05.96-3.37.96-2.59 0-4.79-1.75-5.57-4.1H3.05v2.58A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.43 13.93A6.02 6.02 0 0 1 6.43 10.07V7.49H3.05a10 10 0 0 0 0 12.88l3.38-2.44Z" />
    <path fill="#EA4335" d="M12 6.04c1.46 0 2.78.5 3.82 1.49l2.86-2.86A9.96 9.96 0 0 0 12 2a9.99 9.99 0 0 0-8.95 5.49l3.38 2.44C7.21 7.79 9.41 6.04 12 6.04Z" />
  </svg>
);

type SignupStep =
  | "name_input"
  | "mobile_input"
  | "mobile_otp_verify"
  | "email_option"
  | "email_input"
  | "email_otp_verify"
  | "password_input"
  | "review_account"
  | "create_account";

const SignupNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ============ UI States ============
  const [step, setStep] = useState<SignupStep>("name_input");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ============ Form Data ============
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [googleProfile, setGoogleProfile] = useState<{ idToken?: string; name?: string; email?: string; picture?: string; dob?: string | null; gender?: string | null } | null>(null);
  const [googleFlow, setGoogleFlow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const pending = sessionStorage.getItem("googleAuthPending");
    if (!pending) return;

    try {
      const { idToken, profile } = JSON.parse(pending);
      if (!idToken || !profile?.email) return;

      setGoogleProfile({ idToken, ...profile });
      setGoogleFlow(true);
      setFullName(profile.name || "");
      setEmail(profile.email || "");
      setEmailAdded(true);
      setEmailVerified(true);
      setMobile("");
      setMobileOtp("");
      setMobileOtpSent(false);
      setStep("mobile_input");
    } catch {
      // Ignore invalid pending Google auth data.
    }
  }, [location.pathname]);

  // ============ Verification States ============
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailAdded, setEmailAdded] = useState(false);

  // ============ Helper Functions ============

  const normalizeMobile = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  const validatePassword = (pwd: string) => {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

    if (!passwordPattern.test(pwd)) {
      toast({
        title: "Weak password",
        description: "Password must be 8+ characters with uppercase, lowercase and a number",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // ============ Step 1: Name Input ============

  const handleNameNext = () => {
    if (!fullName.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }
    setStep("mobile_input");
  };

  const handleContinueWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await getGoogleAuthProfile();
      const nextName = result.profile.name || fullName || "";
      const profile = {
        idToken: result.idToken,
        ...result.profile,
      };
      setFullName(nextName);
      setEmail(profile.email || "");
      setGoogleProfile(profile);
      setGoogleFlow(true);
      setEmailAdded(Boolean(profile.email));
      setEmailVerified(Boolean(profile.email));
      setMobile("");
      setMobileOtp("");
      setMobileOtpSent(false);
      setStep("mobile_input");
      toast({
        title: "Google profile loaded",
        description: "Google email verified. Please verify your mobile number to continue.",
      });
    } catch (err: any) {
      toast({
        title: "Google signup failed",
        description: err.message || "Unable to continue with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============ Step 2: Mobile Input ============

  const handleSendMobileOtp = async () => {
    const normalizedMobile = normalizeMobile(mobile);

    if (!normalizedMobile || normalizedMobile.length !== 10) {
      toast({
        title: "Invalid mobile",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/signup/send-mobile-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalizedMobile }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to send OTP");
      }

      setMobileOtpSent(true);
      setStep("mobile_otp_verify");
      toast({
        title: "OTP sent",
        description: "Check your SMS for the verification code",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============ Step 3: Mobile OTP Verification ============

  const handleVerifyMobileOtp = async () => {
    const normalizedMobile = normalizeMobile(mobile);

    if (!mobileOtp || mobileOtp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/signup/verify-mobile-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: normalizedMobile,
          otp: mobileOtp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "OTP verification failed");
      }

      setMobileVerified(true);
      toast({
        title: "Mobile verified",
        description: "Mobile number verified successfully",
      });

      // If this is a Google signup flow, immediately proceed to account creation
      if (googleFlow) {
        // Directly call google-login with the verified mobile
        const loginResponse = await fetch(`${API_BASE}/auth/google-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_token: googleProfile?.idToken,
            full_name: fullName,
            email: googleProfile?.email,
            image_name: googleProfile?.picture,
            dob: googleProfile?.dob,
            gender: googleProfile?.gender,
            mobile: normalizedMobile,
          }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          throw new Error(loginData.detail || loginData.message || "Google signup failed");
        }

        setAuthSession(loginData.access_token, loginData.refresh_token, {
          user_id: loginData.user_id,
          public_id: loginData.public_id || "",
          full_name: loginData.full_name || fullName,
          email: googleProfile?.email || undefined,
          photoURL: googleProfile?.picture || null,
        });

        toast({
          title: "Account created",
          description: "Welcome to Kirnagram!",
        });

        navigate("/home");
        return;
      }

      // For regular signup, continue to email step
      setStep("email_option");
    } catch (err: any) {
      toast({
        title: "OTP verification failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============ Step 4: Password Validation ============

  const handlePasswordNext = () => {
    if (!password || !confirmPassword) {
      toast({
        title: "Missing password",
        description: "Please enter and confirm your password",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (!validatePassword(password)) {
      return;
    }

    setStep("review_account");
  };

  // ============ Step 5: Email Option ============

  const handleSkipEmail = () => {
    setEmailAdded(false);
    setStep("password_input");
  };

  const handleAddEmail = () => {
    setEmailAdded(true);
    setStep("email_input");
  };

  // ============ Step 6: Email Input ============

  const handleSendEmailOtp = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/signup/send-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to send OTP");
      }

      setEmailOtpSent(true);
      setStep("email_otp_verify");
      toast({
        title: "OTP sent",
        description: "Check your email for the verification code",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============ Step 7: Email OTP Verification ============

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/signup/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: emailOtp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "OTP verification failed");
      }

      setEmailVerified(true);
      toast({
        title: "Email verified",
        description: googleFlow ? "Now verify your mobile number" : "Moving to next step",
      });
      setStep(googleFlow ? "mobile_input" : "password_input");
    } catch (err: any) {
      toast({
        title: "OTP verification failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============ Step 8: Create Account ============

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName) {
      toast({
        title: "Missing required fields",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (!googleFlow && !password) {
      toast({
        title: "Missing required fields",
        description: "Password is required",
        variant: "destructive",
      });
      return;
    }

    const normalizedMobile = normalizeMobile(mobile);

    if (!mobileVerified) {
      toast({
        title: "Mobile not verified",
        description: "Please verify your mobile number",
        variant: "destructive",
      });
      return;
    }

    if (emailAdded && !emailVerified) {
      toast({
        title: "Email not verified",
        description: "Please verify your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        full_name: fullName,
        mobile: normalizedMobile,
      };

      if (!googleFlow) {
        payload.password = password;
      }

      if (emailAdded && emailVerified) {
        payload.email = email.toLowerCase().trim();
      }

      if (googleFlow && googleProfile?.email) {
        payload.email = googleProfile.email;
        payload.google_profile = {
          name: googleProfile.name,
          email: googleProfile.email,
          picture: googleProfile.picture,
          dob: googleProfile.dob,
          gender: googleProfile.gender,
        };
      }

      const endpoint = googleFlow ? `${API_BASE}/auth/google-login` : `${API_BASE}/auth/signup`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          googleFlow
            ? {
                id_token: googleProfile?.idToken,
                full_name: fullName,
                email: googleProfile?.email,
                image_name: googleProfile?.picture,
                dob: googleProfile?.dob,
                gender: googleProfile?.gender,
                mobile: normalizedMobile,
              }
            : payload
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      // Persist auth session
      setAuthSession(data.access_token, data.refresh_token, {
        user_id: data.user_id,
        public_id: data.public_id || "",
        full_name: fullName,
        email: (emailAdded && emailVerified) || googleFlow ? (googleFlow ? googleProfile?.email : email.toLowerCase().trim()) : undefined,
      });

      sessionStorage.removeItem("googleAuthPending");

      toast({
        title: "Account created",
        description: "Welcome to Kirnagram.",
      });

      setTimeout(() => {
        navigate("/home");
      }, 500);
    } catch (err: any) {
      toast({
        title: "Signup failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============ Back Button Handler ============

  const handleBack = () => {
    if (step === "mobile_input") {
      setStep("name_input");
      setMobile("");
      setMobileOtp("");
      setMobileOtpSent(false);
    } else if (step === "mobile_otp_verify") {
      setStep("mobile_input");
      setMobileOtp("");
      setMobileOtpSent(false);
    } else if (step === "email_option") {
      setStep("mobile_otp_verify");
    } else if (step === "email_input") {
      setStep("email_option");
      setEmail("");
      setEmailOtp("");
      setEmailOtpSent(false);
      setEmailVerified(false);
    } else if (step === "email_otp_verify") {
      setStep("email_input");
      setEmailOtp("");
      setEmailOtpSent(false);
    } else if (step === "password_input") {
      if (emailAdded) {
        setStep("email_otp_verify");
      } else {
        setStep("email_option");
      }
      setPassword("");
      setConfirmPassword("");
    } else if (step === "review_account") {
      setStep("password_input");
    } else if (step === "create_account") {
      setStep("review_account");
    }
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.12),_transparent_30%),linear-gradient(135deg,_#fffdf8_0%,_#ffffff_45%,_#fff7ed_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_30%),linear-gradient(135deg,_#050505_0%,_#0b0b0b_45%,_#111111_100%)] dark:text-white">
      {/* Left Panel - Image */}
      <div className="hidden lg:block lg:w-[58%] relative overflow-hidden bg-gradient-to-br from-orange-100 via-white to-amber-50 dark:from-zinc-950 dark:via-[#0b0b0b] dark:to-zinc-900">
        <img
          src={heroBanner}
          alt="Hero Banner"
          className="w-full h-full object-cover opacity-70 dark:opacity-60"
        />
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <img
              src={kirnagramLogoText}
              alt="Kirnagram"
              className="h-45 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-1">
              Join Kirnagram
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">Create your account in minutes</p>
          </div>

          {/* Progress Bar - Step Counter */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2">
              <span>Progress</span>
              <span>
                {step === "name_input" ? "1/9" :
                 step === "mobile_input" ? "2/9" :
                 step === "mobile_otp_verify" ? "3/9" :
                 step === "email_option" ? "4/9" :
                 step === "email_input" ? "5/9" :
                 step === "email_otp_verify" ? "6/9" :
                 step === "password_input" ? "7/9" :
                 step === "review_account" ? "8/9" :
                 "9/9"}
              </span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2 border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: step === "name_input" ? "11%" :
                         step === "mobile_input" ? "22%" :
                         step === "mobile_otp_verify" ? "33%" :
                         step === "email_option" ? "44%" :
                         step === "email_input" ? "55%" :
                         step === "email_otp_verify" ? "66%" :
                         step === "password_input" ? "77%" :
                         step === "review_account" ? "88%" :
                         "100%"
                }}
              />
            </div>
          </div>

          {/* Progress Indicators - Verified Fields Summary */}
          <div className="mb-8 space-y-2">
            {fullName && (
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-950/20 to-amber-950/10 border border-orange-500/30 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-xs text-gray-900 dark:text-white font-bold">
                  ✓
                </div>
                <span className="text-sm font-medium text-orange-300">{fullName}</span>
              </div>
            )}
            {mobileVerified && (
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-950/20 to-amber-950/10 border border-orange-500/30 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-xs text-gray-900 dark:text-white font-bold">
                  ✓
                </div>
                <span className="text-sm font-medium text-orange-300">+91 {mobile}</span>
              </div>
            )}
            {emailVerified && (
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-950/20 to-amber-950/10 border border-orange-500/30 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-xs text-gray-900 dark:text-white font-bold">
                  ✓
                </div>
                <span className="text-sm font-medium text-orange-300">{email}</span>
              </div>
            )}
          </div>

          {/* STEP 1: Full Name Input */}
          {step === "name_input" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNameNext();
              }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-zinc-900/80 dark:via-zinc-950 dark:to-zinc-950 border-2 border-orange-200/60 dark:border-orange-500/40 rounded-2xl p-7 space-y-4 shadow-lg shadow-orange-200/10 dark:shadow-xl dark:shadow-orange-950/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm">1</div>
                  <label className="text-sm font-bold text-orange-300 uppercase tracking-widest">Full Name</label>
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-5 py-4 bg-orange-50/30 dark:bg-white dark:bg-zinc-950/70 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 focus:outline-none transition text-lg font-medium"
                  autoFocus
                />
                <p className="text-xs text-gray-600 dark:text-gray-500 dark:text-gray-400 font-medium">We will use this to personalize your profile.</p>
              </div>

              <button
                type="button"
                onClick={handleContinueWithGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 border border-zinc-300 bg-white/90 hover:bg-zinc-50 text-gray-900 font-semibold py-3 rounded-xl transition duration-200 shadow-sm"
              >
                <GoogleIcon />
                {loading ? "Loading..." : "Continue with Google"}
              </button>

              <button
                type="submit"
                disabled={!fullName.trim()}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-lg"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* STEP 2: Mobile Number Input */}
          {step === "mobile_input" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMobileOtp();
              }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-zinc-900/80 dark:via-zinc-950 dark:to-zinc-950 border-2 border-orange-200/60 dark:border-orange-500/40 rounded-2xl p-7 space-y-4 shadow-lg shadow-orange-200/10 dark:shadow-xl dark:shadow-orange-950/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm">2</div>
                  <label className="text-sm font-bold text-orange-300 uppercase tracking-widest">Mobile Number</label>
                </div>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                  placeholder="Enter 10-digit mobile"
                  maxLength={10}
                  className="w-full px-5 py-4 bg-orange-50/30 dark:bg-white dark:bg-zinc-950/70 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 focus:outline-none transition text-lg font-medium"
                  autoFocus
                />
                <p className="text-xs text-gray-600 dark:text-gray-500 dark:text-gray-400 font-medium">We will send a verification code to confirm your number.</p>
              </div>

              <button
                type="submit"
                disabled={loading || mobile.length !== 10}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-lg"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {loading ? "Sending..." : "Send OTP"}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-3 text-sm flex items-center justify-center gap-1 transition font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}

          {/* STEP 3: Mobile OTP Verification */}
          {step === "mobile_otp_verify" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyMobileOtp();
              }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-zinc-900/80 dark:via-zinc-950 dark:to-zinc-950 border-2 border-orange-200/60 dark:border-orange-500/40 rounded-2xl p-7 space-y-4 shadow-lg shadow-orange-200/10 dark:shadow-xl dark:shadow-orange-950/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm">2</div>
                  <label className="text-sm font-bold text-orange-300 uppercase tracking-widest">Verify Mobile</label>
                </div>
                <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm font-medium">Enter the 6-digit OTP sent to <span className="text-orange-300 font-bold">+91 {mobile}</span></p>
                <input
                  type="text"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-5 py-5 bg-orange-50/30 dark:bg-white dark:bg-zinc-950/70 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 focus:outline-none transition text-center tracking-widest text-3xl font-bold"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || mobileOtp.length !== 6}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-lg"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-3 text-sm flex items-center justify-center gap-1 transition font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}

          {/* STEP 4: Email Option */}
          {step === "email_option" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-zinc-900/80 dark:via-zinc-950 dark:to-zinc-950 border-2 border-orange-200/60 dark:border-orange-500/40 rounded-2xl p-7 shadow-lg shadow-orange-200/10 dark:shadow-xl dark:shadow-orange-950/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm">3</div>
                  <span className="text-sm font-bold text-orange-300 uppercase tracking-widest">Email (Optional)</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Add an email to secure your account and receive important updates.</p>
                <p className="text-xs text-gray-600 dark:text-gray-500 mt-2">You can always update it later in your profile settings</p>
              </div>

              <button
                onClick={handleAddEmail}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-gray-900 dark:text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-lg"
              >
                <CheckCircle className="w-5 h-5" /> Add Email Now
              </button>

              <button
                onClick={handleSkipEmail}
                className="w-full bg-gray-50 dark:bg-zinc-900/60 border-2 border-zinc-700 hover:border-orange-500/50 hover:bg-zinc-800/80 text-gray-200 font-bold py-4 rounded-xl transition duration-200 text-lg"
              >
                Continue Without Email
              </button>

              <button
                onClick={handleBack}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-3 text-sm flex items-center justify-center gap-1 transition font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {/* STEP 5: Email Input */}
          {step === "email_input" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendEmailOtp();
              }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-zinc-900/80 dark:via-zinc-950 dark:to-zinc-950 border-2 border-orange-200/60 dark:border-orange-500/40 rounded-2xl p-7 space-y-4 shadow-lg shadow-orange-200/10 dark:shadow-xl dark:shadow-orange-950/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm">3</div>
                  <label className="text-sm font-bold text-orange-300 uppercase tracking-widest">Email Address</label>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={emailOtpSent}
                  className="w-full px-5 py-4 bg-orange-50/30 dark:bg-white dark:bg-zinc-950/70 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 focus:outline-none transition disabled:opacity-50 text-lg font-medium"
                  autoFocus
                />
                <p className="text-xs text-gray-600 dark:text-gray-500 dark:text-gray-400 font-medium">We will send a verification code to confirm it.</p>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-lg"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {loading ? "Sending..." : "Send OTP"}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-3 text-sm flex items-center justify-center gap-1 transition font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}

          {/* STEP 6: Email OTP Verification */}
          {step === "email_otp_verify" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyEmailOtp();
              }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-zinc-900/80 dark:via-zinc-950 dark:to-zinc-950 border-2 border-orange-200/60 dark:border-orange-500/40 rounded-2xl p-7 space-y-4 shadow-lg shadow-orange-200/10 dark:shadow-xl dark:shadow-orange-950/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm">3</div>
                  <label className="text-sm font-bold text-orange-300 uppercase tracking-widest">Verify Email</label>
                </div>
                <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm font-medium">Enter the 6-digit OTP sent to <span className="text-orange-300 font-bold">{email}</span></p>
                <input
                  type="text"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-5 py-5 bg-orange-50/30 dark:bg-white dark:bg-zinc-950/70 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 focus:outline-none transition text-center tracking-widest text-3xl font-bold"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || emailOtp.length !== 6}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-lg"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-3 text-sm flex items-center justify-center gap-1 transition font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}

          {/* STEP 7: Password Input */}
          {step === "password_input" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePasswordNext();
              }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-zinc-900/80 dark:via-zinc-950 dark:to-zinc-950 border-2 border-orange-200/60 dark:border-orange-500/40 rounded-2xl p-7 space-y-5 shadow-lg shadow-orange-200/10 dark:shadow-xl dark:shadow-orange-950/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm">4</div>
                  <label className="text-sm font-bold text-orange-300 uppercase tracking-widest">Set Password</label>
                </div>
                <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-xs font-medium">Use at least 8 characters with uppercase, lowercase, and a number.</p>
                
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-5 py-4 bg-orange-50/30 dark:bg-white dark:bg-zinc-950/70 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 focus:outline-none transition font-medium pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full px-5 py-4 bg-orange-50/30 dark:bg-white dark:bg-zinc-950/70 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 focus:outline-none transition font-medium pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!password || !confirmPassword || password !== confirmPassword}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-lg"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-3 text-sm flex items-center justify-center gap-1 transition font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}

          {/* STEP 8: Review Account */}
          {step === "review_account" && (
            <form onSubmit={() => setStep("create_account")} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Review Your Details</h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">Everything looks good? Proceed to create your account</p>
              </div>
              
              {/* Name Box */}
              <div className="bg-gradient-to-br from-orange-950/30 to-amber-950/20 border-2 border-orange-500/50 rounded-2xl p-6 hover:border-orange-500/70 transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold flex-shrink-0 shadow-lg shadow-orange-500/30">
                    ✓
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-orange-400 uppercase tracking-widest font-bold">Full Name</p>
                    <p className="text-lg font-bold text-orange-100 mt-1">{fullName}</p>
                  </div>
                </div>
              </div>

              {/* Mobile Box */}
              <div className="bg-gradient-to-br from-orange-950/30 to-amber-950/20 border-2 border-orange-500/50 rounded-2xl p-6 hover:border-orange-500/70 transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold flex-shrink-0 shadow-lg shadow-orange-500/30">
                    ✓
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-orange-400 uppercase tracking-widest font-bold">Mobile Number</p>
                    <p className="text-lg font-bold text-orange-100 mt-1">+91 {mobile}</p>
                  </div>
                </div>
              </div>

              {/* Email Box - if added */}
              {emailVerified && (
                <div className="bg-gradient-to-br from-orange-950/30 to-amber-950/20 border-2 border-orange-500/50 rounded-2xl p-6 hover:border-orange-500/70 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold flex-shrink-0 shadow-lg shadow-orange-500/30">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-orange-400 uppercase tracking-widest font-bold">Email Address</p>
                      <p className="text-lg font-bold text-orange-100 mt-1">{email}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-gray-900 dark:text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-lg"
              >
                <CheckCircle className="w-5 h-5" /> Review Complete
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-3 text-sm flex items-center justify-center gap-1 transition font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}

          {/* STEP 9: Create Account Final */}
          {step === "create_account" && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="text-center mb-8 py-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 mb-6 shadow-xl shadow-orange-500/40 animate-pulse">
                  <CheckCircle className="w-10 h-10 text-gray-900 dark:text-white" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-300 to-amber-300 bg-clip-text text-transparent mb-2">Ready to Go!</h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">Click below to activate your Kirnagram account.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-5 rounded-xl transition duration-200 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/40 text-lg hover:shadow-orange-500/50"
              >
                {loading ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    Create My Account
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-3 text-sm flex items-center justify-center gap-1 transition disabled:opacity-50 font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupNew;
