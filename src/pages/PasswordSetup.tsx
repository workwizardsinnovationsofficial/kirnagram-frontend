import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Lock } from "lucide-react";
import kirnagramLogoText from "@/assets/kirnagram@2.png";
import heroBanner from "@/assets/hero-banner.jpg";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "https://api.kirnagram.com";

const PasswordSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
    return passwordPattern.test(pwd);
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: "Missing fields",
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
      toast({
        title: "Weak password",
        description: "Password must be 8+ characters with uppercase, lowercase and a number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error("Session expired. Please login again");
      }

      const response = await fetch(`${API_BASE}/auth/setup-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          new_password: password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to set up password");
      }

      toast({
        title: "Success! 🎉",
        description: "Your password has been set up successfully",
      });

      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate("/home");
      }, 2000);
    } catch (err: any) {
      toast({
        title: "Password setup failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipForNow = () => {
    toast({
      title: "Noted",
      description: "You can set up a password anytime from your account settings",
    });
    navigate("/home");
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

      {/* Right Panel - Form */}
      <div className="w-full lg:w-[42%] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <img
              src={kirnagramLogoText}
              alt="Kirnagram"
              className="h-23 mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              Secure Your Account
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Set up a strong password to protect your Kirnagram account
            </p>
          </div>

          {/* Password Setup Form */}
          <form onSubmit={handleSetupPassword} className="space-y-6">
            {/* Password Input */}
            <div className="bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-zinc-900/80 dark:via-zinc-950 dark:to-zinc-950 border-2 border-orange-200/60 dark:border-orange-500/40 rounded-2xl p-7 space-y-4 shadow-lg shadow-orange-200/10 dark:shadow-xl dark:shadow-orange-950/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm">
                  1
                </div>
                <label className="text-sm font-bold text-orange-300 uppercase tracking-widest">
                  New Password
                </label>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-5 py-4 bg-orange-50/30 dark:bg-white dark:bg-zinc-950/70 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 focus:outline-none transition text-lg font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-500 dark:text-gray-400 font-medium">
                💡 Use uppercase, lowercase, numbers and symbols for a strong password
              </p>
            </div>

            {/* Confirm Password Input */}
            <div className="bg-gradient-to-br from-orange-50/50 via-white to-white dark:from-zinc-900/80 dark:via-zinc-950 dark:to-zinc-950 border-2 border-orange-200/60 dark:border-orange-500/40 rounded-2xl p-7 space-y-4 shadow-lg shadow-orange-200/10 dark:shadow-xl dark:shadow-orange-950/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-gray-900 dark:text-white font-bold text-sm">
                  2
                </div>
                <label className="text-sm font-bold text-orange-300 uppercase tracking-widest">
                  Confirm Password
                </label>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full px-5 py-4 bg-orange-50/30 dark:bg-white dark:bg-zinc-950/70 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 focus:outline-none transition text-lg font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-500 dark:text-gray-400 font-medium">
                💡 Make sure your passwords match
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-bold py-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 text-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin">
                    <Lock className="w-5 h-5" />
                  </div>
                  Setting up...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Set Up Password
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Skip Option */}
            <button
              type="button"
              onClick={handleSkipForNow}
              className="w-full text-gray-600 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 py-3 text-sm transition font-medium"
            >
              I'll set up a password later
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordSetup;
