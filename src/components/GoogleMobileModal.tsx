import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Phone, ArrowRight, Loader } from "lucide-react";
import { auth } from "@/firebase";

interface GoogleMobileModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoogleMobileModal = ({
  open,
  onClose,
  onSuccess,
}: GoogleMobileModalProps) => {
  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setMobile(value);
    setMobileError("");
  };

  const validateMobile = async (value: string) => {
    if (value.length !== 10) {
      setMobileError("Mobile number must be 10 digits");
      return false;
    }

    try {
      const checkRes = await fetch("http://127.0.0.1:8000/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "", mobile: value }),
      });

      const checkData = await checkRes.json();

      if (checkData.mobileExists) {
        setMobileError("Mobile number already in use");
        return false;
      }

      return true;
    } catch (err) {
      console.error("Mobile check failed:", err);
      setMobileError("Failed to validate mobile number");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mobile) {
      setMobileError("Please enter your mobile number");
      return;
    }

    setLoading(true);

    try {
      const isValid = await validateMobile(mobile);
      if (!isValid) {
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setMobileError("User not found");
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();

      // Update user profile with mobile number
      const res = await fetch("http://127.0.0.1:8000/profile/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobile: mobile,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setMobileError("Failed to save mobile number");
      }
    } catch (error) {
      console.error("Error:", error);
      setMobileError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            We need your mobile number to complete your profile setup
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="tel"
                value={mobile}
                onChange={handleMobileChange}
                placeholder="10 digit mobile number"
                disabled={loading}
                className={`w-full pl-12 pr-4 py-3 bg-muted/50 rounded-xl text-sm placeholder:text-muted-foreground 
                  focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    mobileError
                      ? "border-2 border-red-600 focus:ring-red-600 focus:border-red-600"
                      : "border border-border focus:ring-primary/50 focus:border-primary/50"
                  }
                `}
                maxLength={10}
              />
            </div>
            {mobileError && (
              <p className="text-red-600 text-sm mt-2">{mobileError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || mobile.length !== 10}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 
              bg-gradient-to-r from-primary to-cyan-400 text-primary-foreground rounded-xl font-medium text-sm
              transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30
            `}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
