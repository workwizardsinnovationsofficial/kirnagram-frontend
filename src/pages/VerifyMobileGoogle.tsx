import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Smartphone, ArrowRight, Loader, CheckCircle } from "lucide-react";
import kirnagramLogoText from "@/assets/kirnagram@2.png";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "http://localhost:8000";

const VerifyMobileGoogle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [mobile, setMobile] = useState(location.state?.mobile || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  // Redirect if this page is opened without a pending Google signup
  useEffect(() => {
    const googleAuthData = sessionStorage.getItem("googleAuthPending");
    if (!googleAuthData) {
      navigate("/login");
    }
  }, [navigate]);

  // Timer for OTP resend
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(timer - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const normalizeMobile = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  const handleSendOtp = async () => {
    const trimmed = mobile.trim();
    
    if (!trimmed) {
      toast({
        title: "Missing Mobile",
        description: "Please enter your mobile number",
        variant: "destructive",
      });
      return;
    }

    const normalized = normalizeMobile(trimmed);
    if (normalized.length !== 10) {
      toast({
        title: "Invalid Mobile",
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
        body: JSON.stringify({ mobile: normalized }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to send OTP");
      }

      setMobile(normalized);
      setOtpSent(true);
      setTimer(60);
      
      toast({
        title: "OTP Sent",
        description: "Verification code sent to your mobile",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast({
        title: "Missing OTP",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/signup/verify-mobile-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Invalid OTP");
      }

      toast({
        title: "Mobile Verified",
        description: "Your mobile number has been verified successfully",
      });

      // Retrieve Google auth data from session storage
      const googleAuthData = sessionStorage.getItem("googleAuthPending");
      if (googleAuthData) {
        const { idToken, profile } = JSON.parse(googleAuthData);
        
        // Now call google-login with verified mobile
        const loginResponse = await fetch(`${API_BASE}/auth/google-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_token: idToken,
            full_name: profile.name,
            email: profile.email,
            image_name: profile.picture,
            dob: profile.dob,
            gender: profile.gender,
            mobile: mobile,
          }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          throw new Error(loginData.detail || "Login failed");
        }

        // Set auth session
        const { setAuthSession } = await import("@/firebase");
        setAuthSession(loginData.access_token, loginData.refresh_token, {
          user_id: loginData.user_id,
          public_id: loginData.public_id || "",
          full_name: loginData.full_name || profile.name || "",
          email: profile.email || undefined,
          photoURL: profile.picture || null,
        });

        // Clear session storage
        sessionStorage.removeItem("googleAuthPending");

        // Check if password setup is needed
        if (loginData.needs_password_setup) {
          navigate("/auth/setup-password");
        } else {
          navigate("/home");
        }
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={kirnagramLogoText} alt="Kirnagram" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Mobile</h1>
          <p className="text-gray-600">Complete your Google sign up</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {!otpSent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Smartphone className="inline mr-2" size={16} />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? <Loader className="inline mr-2 animate-spin" size={18} /> : <ArrowRight className="inline mr-2" size={18} />}
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <CheckCircle className="inline text-green-500 mb-2" size={32} />
                <p className="text-sm text-gray-600">OTP sent to {mobile}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={loading}
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-2xl tracking-widest"
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? <Loader className="inline mr-2 animate-spin" size={18} /> : <CheckCircle className="inline mr-2" size={18} />}
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>

              {timer > 0 ? (
                <p className="text-center text-sm text-gray-600">
                  Resend OTP in {timer}s
                </p>
              ) : (
                <button
                  onClick={handleSendOtp}
                  className="w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Resend OTP
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          Having issues? <a href="/login" className="text-orange-600 hover:text-orange-700 font-medium">Go back</a>
        </p>
      </div>
    </div>
  );
};

export default VerifyMobileGoogle;
