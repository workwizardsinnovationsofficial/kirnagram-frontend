import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/firebase";

const TwoFactor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [actionType, setActionType] = useState<"enable" | "disable">("enable");

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      setEmail(user.email || "");

      const token = await user.getIdToken();
      const res = await fetch("http://127.0.0.1:8000/profile/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setTwoFAEnabled(data.two_factor_enabled || false);
    };

    fetchProfile();
  }, []);

  const requestOtp = async (type: "enable" | "disable") => {
    setActionType(type);
    setLoading(true);

    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();

    await fetch("http://127.0.0.1:8000/2fa/request", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    toast({
      title: "OTP Sent",
      description: "Check your email for verification code.",
    });

    setOtpSent(true);
    setLoading(false);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const endpoint =
        actionType === "enable"
          ? "http://127.0.0.1:8000/2fa/verify"
          : "http://127.0.0.1:8000/2fa/disable";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp }),
      });

      if (!res.ok) throw new Error();

      const newState = actionType === "enable";
      setTwoFAEnabled(newState);
      setOtpSent(false);
      setOtp("");

      toast({
        title: newState ? "2FA Enabled" : "2FA Disabled",
      });

    } catch {
      toast({
        title: "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Two-Factor Authentication</h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border space-y-6">

          <Shield className="w-12 h-12 text-orange-500 mx-auto" />

          <div className="flex items-center justify-between border p-4 rounded-xl">
            <div>
              <p className="font-semibold">Enable 2FA</p>
              <p className="text-sm text-muted-foreground">
                Secure your account
              </p>
            </div>

            <button
              onClick={() =>
                twoFAEnabled
                  ? requestOtp("disable")
                  : requestOtp("enable")
              }
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                twoFAEnabled ? "bg-orange-500" : "bg-gray-600"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full transform transition ${
                  twoFAEnabled ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          {otpSent && (
            <>
              <p className="text-sm text-muted-foreground">
                OTP sent to:
              </p>
              <p className="text-orange-400 font-semibold">
                {email}
              </p>

              <form onSubmit={verifyOtp} className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full py-3 text-center border rounded-xl"
                  required
                />
                <button className="w-full py-3 bg-orange-500 text-gray-900 dark:text-white rounded-xl">
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactor;
