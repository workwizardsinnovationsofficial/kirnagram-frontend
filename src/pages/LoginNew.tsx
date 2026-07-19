import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Smartphone, ArrowRight, Loader, CheckCircle, Lock } from "lucide-react";
import kirnagramLogoText from "@/assets/kirnagram@2.png";
import heroBanner from "@/assets/hero-banner.jpg";
import { useToast } from "@/hooks/use-toast";
import { getGoogleAuthProfile, setAuthSession } from "@/firebase";

const API_BASE = "http://localhost:8000";

type LoginStep = "email_mobile_input" | "password_entry" | "forgot_password_email_mobile" | "forgot_password_otp" | "reset_password_entry";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.53Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.24-2.5c-.9.6-2.05.96-3.37.96-2.59 0-4.79-1.75-5.57-4.1H3.05v2.58A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.43 13.93A6.02 6.02 0 0 1 6.43 10.07V7.49H3.05a10 10 0 0 0 0 12.88l3.38-2.44Z" />
    <path fill="#EA4335" d="M12 6.04c1.46 0 2.78.5 3.82 1.49l2.86-2.86A9.96 9.96 0 0 0 12 2a9.99 9.99 0 0 0-8.95 5.49l3.38 2.44C7.21 7.79 9.41 6.04 12 6.04Z" />
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ============ UI States ============
  const [step, setStep] = useState<LoginStep>("email_mobile_input");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPasswordOptions, setShowForgotPasswordOptions] = useState(false);
  const [otpMode, setOtpMode] = useState<"login" | "reset">("reset");

  // ============ Email/Mobile Input ============
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [isEmail, setIsEmail] = useState(true);

  // ============ Password Login ============
  const [password, setPassword] = useState("");

  // ============ Forgot Password Flow ============
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ============ Helper Functions ============

  const normalizeEmail = (value: string) => value.trim().toLowerCase();
  const normalizeMobile = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  const detectEmailOrMobile = (value: string) => {
    const normalized = value.trim();
    if (normalized.includes("@")) {
      setIsEmail(true);
    } else {
      setIsEmail(false);
    }
  };

  // ============ Step 1: Email/Mobile Input ============

  const handleNextFromEmailMobile = () => {
    const trimmed = emailOrMobile.trim();

    if (!trimmed) {
      toast({
        title: "Missing input",
        description: "Please enter your email or mobile number",
        variant: "destructive",
      });
      return;
    }

    const inputIsEmail = trimmed.includes("@");
    setIsEmail(inputIsEmail);

    if (inputIsEmail) {
      if (!trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }
    } else {
      const normalized = normalizeMobile(trimmed);
      if (normalized.length !== 10) {
        toast({
          title: "Invalid mobile",
          description: "Please enter a valid 10-digit mobile number",
          variant: "destructive",
        });
        return;
      }
    }

    setPassword("");
    setShowForgotPasswordOptions(false);
    setStep("password_entry");
  };

  // ============ Step 2: Login Method Selection ============

  const handleShowForgotPasswordOptions = () => {
    setOtpMode("reset");
    setOtpSent(false);
    setOtp("");
    setStep("forgot_password_otp");
    setShowForgotPasswordOptions(false);
    void handleSendOtp();
  };

  const handleProceedWithOtp = () => {
    setOtpMode("login");
    setOtpSent(false);
    setOtp("");
    setStep("forgot_password_otp");
    setShowForgotPasswordOptions(false);
    void handleSendOtp();
  };

  // ============ Step 3a: Password Entry ============

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast({
        title: "Missing password",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        password,
      };

      if (isEmail) {
        payload.email = normalizeEmail(emailOrMobile);
        payload.login_type = "email_password";
      } else {
        payload.mobile = normalizeMobile(emailOrMobile);
        payload.login_type = "mobile_password";
      }

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // Persist auth session
      setAuthSession(data.access_token, data.refresh_token, {
        user_id: data.user_id,
        public_id: data.public_id || "",
        full_name: data.full_name || "",
        email: isEmail ? normalizeEmail(emailOrMobile) : undefined,
      });

      toast({
        title: "Login successful",
        description: "Welcome back.",
      });

      // Redirect to home after brief delay
      setTimeout(() => {
        navigate("/home");
      }, 500);
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============ Step 3b: Forgot Password - Send OTP ============

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const payload: any = {};

      if (isEmail) {
        payload.email = normalizeEmail(emailOrMobile);
      } else {
        payload.mobile = normalizeMobile(emailOrMobile);
      }

      const response = await fetch(`${API_BASE}/auth/forgot-password-send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to send OTP");
      }

      setOtpSent(true);
      toast({
        title: "OTP sent",
        description: isEmail ? "Check your email for the code" : "Check your SMS for the code",
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

  const handleVerifyLoginOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        otp,
        login_type: isEmail ? "email_otp" : "mobile_otp",
      };

      if (isEmail) {
        payload.email = normalizeEmail(emailOrMobile);
      } else {
        payload.mobile = normalizeMobile(emailOrMobile);
      }

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "OTP login failed");
      }

      setAuthSession(data.access_token, data.refresh_token, {
        user_id: data.user_id,
        public_id: data.public_id || "",
        full_name: data.full_name || "",
        email: isEmail ? normalizeEmail(emailOrMobile) : undefined,
      });

      toast({
        title: "Login successful",
        description: "Welcome back.",
      });

      setTimeout(() => {
        navigate("/home");
      }, 500);
    } catch (err: any) {
      toast({
        title: "OTP login failed",
        description: err.message || "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============ Step 3c: Reset Password Entry ============

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing password",
        description: "Please enter and confirm your new password",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        otp,
        new_password: newPassword,
      };

      if (isEmail) {
        payload.email = normalizeEmail(emailOrMobile);
      } else {
        payload.mobile = normalizeMobile(emailOrMobile);
      }

      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to reset password");
      }

      toast({
        title: "Password reset successful",
        description: "You can now sign in with your new password.",
      });

      // Reset to login method selection
      setPassword("");
    setShowForgotPasswordOptions(false);
    setStep("password_entry");
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============ Back Button Handler ============

  const handleContinueWithGoogle = async () => {
    setLoading(true);
    try {
      const { idToken, profile } = await getGoogleAuthProfile();
      
      const response = await fetch(`${API_BASE}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          full_name: profile.name,
          email: profile.email,
          image_name: profile.picture,
          dob: profile.dob,
          gender: profile.gender,
          mobile: profile.mobile,
        }),
      });

      const data = await response.json().catch(() => ({}));
      
      // Handle errors that require mobile verification
      if (!response.ok) {
        const errorMessage = data.detail || data.message || "Google login failed";
        
        // If this is a new user needing mobile verification, redirect to signup with Google
        if (errorMessage.includes("Mobile number is required") || errorMessage.includes("Mobile number not verified")) {
          toast({
            title: "Continue with Google",
            description: "This Google account is not registered. Please finish signup by verifying your mobile number.",
          });
          
          // Store Google profile data for signup flow
          sessionStorage.setItem("googleAuthPending", JSON.stringify({
            idToken,
            profile,
          }));
          
          // Redirect to signup so user can complete mobile verification and account creation
          navigate("/signup");
          setLoading(false);
          return;
        }
        
        throw new Error(errorMessage);
      }

      setAuthSession(data.access_token, data.refresh_token, {
        user_id: data.user_id,
        public_id: data.public_id || "",
        full_name: data.full_name || profile.name || "",
        email: profile.email || undefined,
        photoURL: profile.picture || null,
      });

      // Check if password setup is needed (new Google accounts)
      if (data.is_new_user) {
        toast({
          title: "Account created",
          description: "Welcome to Kirnagram! Your account is ready.",
        });
      } else {
        toast({
          title: "Login successful",
          description: "Welcome back.",
        });
      }
      
      // Navigate to home after a brief delay
      setTimeout(() => {
        navigate("/home");
      }, 500);
    } catch (err: any) {
      toast({
        title: "Google login failed",
        description: err.message || "Unable to continue with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "password_entry") {
      setStep("email_mobile_input");
      setPassword("");
      setShowForgotPasswordOptions(false);
    } else if (step === "forgot_password_otp") {
      setStep("password_entry");
      setOtp("");
      setOtpSent(false);
      setShowForgotPasswordOptions(false);
      setOtpMode("reset");
    } else if (step === "reset_password_entry") {
      setStep("forgot_password_otp");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
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

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <img
              src={kirnagramLogoText}
              alt="Kirnagram"
              className="h-23 mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Welcome Back</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Login to your account</p>
          </div>

          {/* STEP 1: Email/Mobile Input */}
          {step === "email_mobile_input" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Email or Mobile Number
                </label>
                <input
                  type="text"
                  value={emailOrMobile}
                  onChange={(e) => {
                    setEmailOrMobile(e.target.value);
                    detectEmailOrMobile(e.target.value);
                  }}
                  placeholder="you@example.com or 9876543210"
                  className="w-full px-4 py-3 bg-white/95 dark:bg-white dark:bg-zinc-950/95 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-zinc-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                  onKeyPress={(e) => e.key === "Enter" && handleNextFromEmailMobile()}
                />
              </div>

              <button
                type="button"
                onClick={handleContinueWithGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 border border-zinc-300 bg-white/90 hover:bg-zinc-50 text-gray-900 font-semibold py-3 rounded-lg transition duration-200 shadow-sm"
              >
                <GoogleIcon />
                {loading ? "Loading..." : "Continue with Google"}
              </button>

              <button
                onClick={handleNextFromEmailMobile}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm">
                Don't have an account?{" "}
                <Link to="/signup" className="text-orange-500 hover:text-orange-400 font-semibold">
                  Sign up
                </Link>
              </div>
            </div>
          )}

          {/* STEP 3A: Password Entry */}
          {step === "password_entry" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="bg-orange-50/80 border border-orange-200/70 rounded-lg p-3 mb-2 dark:bg-zinc-900/70 dark:border-zinc-700">
                <p className="text-zinc-700 dark:text-zinc-300 text-xs">
                  <span className="font-semibold">{isEmail ? emailOrMobile : `+91 ${emailOrMobile}`}</span>
                </p>
              </div>

              {!showForgotPasswordOptions && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-4 py-3 bg-white text-zinc-900 placeholder:text-zinc-400 rounded-lg border border-zinc-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition dark:bg-zinc-950/90 dark:text-white dark:border-zinc-700 dark:placeholder:text-zinc-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Text Links Section */}
                  <div className="flex justify-between gap-4 py-2">
                    <button
                      type="button"
                      onClick={() => handleShowForgotPasswordOptions()}
                      className="text-red-500 hover:text-red-400 font-semibold text-sm transition duration-200"
                    >
                      Forgot Password?
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProceedWithOtp()}
                      className="text-orange-500 hover:text-orange-400 font-semibold text-sm transition duration-200"
                    >
                      Login with OTP
                    </button>
                  </div>

                  {/* Main Login Button */}
                  <button
                    type="submit"
                    disabled={loading || !password}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                  >
                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                    {loading ? "Logging in..." : "Login"}
                  </button>

                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 py-2 text-sm"
                  >
                    ← Back
                  </button>
                </>
              )}
            </form>
          )}

          {/* STEP 3B: OTP Entry */}
          {step === "forgot_password_otp" && (
            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <div className="bg-white/80 border border-zinc-200 rounded-lg p-4 shadow-sm dark:bg-zinc-900/70 dark:border-zinc-700">
                    <p className="text-zinc-700 dark:text-zinc-300 text-sm mb-4">
                      {otpMode === "login"
                        ? `We'll send a login OTP to your ${isEmail ? "email" : "mobile number"}`
                        : `We'll send an OTP to your ${isEmail ? "email" : "mobile number"}`}
                    </p>
                  </div>

                  <button
                    onClick={otpMode === "login" ? handleSendOtp : handleSendOtp}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 text-gray-900 dark:text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
                  >
                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                    {loading ? "Sending OTP..." : otpMode === "login" ? "Send Login OTP" : "Send OTP"}
                  </button>
                </>
              ) : (
                <div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    OTP sent! Check your {isEmail ? "email" : "SMS"}
                  </p>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                      OTP (6 digits)
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full px-4 py-3 bg-white text-zinc-900 text-center text-2xl tracking-widest rounded-lg border border-zinc-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition dark:bg-zinc-950/90 dark:text-white dark:border-zinc-700"
                      maxLength={6}
                    />
                  </div>

                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    className="w-full text-orange-400 hover:text-orange-300 text-sm mb-4"
                  >
                    Didn't receive? Send again
                  </button>

                  {otpMode === "login" ? (
                    <button
                      onClick={handleVerifyLoginOtp}
                      disabled={loading || otp.length !== 6}
                      className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 text-gray-900 dark:text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg shadow-orange-500/10"
                    >
                      {loading ? "Verifying..." : "Verify OTP"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setOtpSent(true);
                        setStep("reset_password_entry");
                      }}
                      className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg shadow-orange-500/20"
                    >
                      Next
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleBack}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-2 text-sm"
              >
                ← Back
              </button>
            </div>
          )}

          {/* STEP 3C: Reset Password */}
          {step === "reset_password_entry" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  OTP (6 digits)
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-white/95 dark:bg-white dark:bg-zinc-950/95 text-gray-900 dark:text-white text-center text-2xl tracking-widest rounded-lg border border-gray-300 dark:border-zinc-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                  maxLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 bg-white/95 dark:bg-white dark:bg-zinc-950/95 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-zinc-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-500 dark:text-gray-400"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 bg-white/95 dark:bg-white dark:bg-zinc-950/95 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-zinc-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-500 dark:text-gray-400"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 text-gray-900 dark:text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 py-2 text-sm"
              >
                ← Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
