import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Bell,
  Moon,
  HelpCircle,
  Building2,
  FileText,
  LogOut,
  ChevronRight,
  Lock,
  CreditCard,
  Users,
  UserPlus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/firebase";

const Settings = () => {
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const { toast } = useToast();
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("http://127.0.0.1:8000/profile/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setIsPrivateAccount(data.account_type === "private");
        }
      } catch (error) {
        console.error("Failed to load account type", error);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Logout failed",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const togglePrivacy = async () => {
    if (updatingPrivacy) return;
    try {
      setUpdatingPrivacy(true);
      const user = auth.currentUser;
      if (!user) return;

      const nextValue = !isPrivateAccount;
      const token = await user.getIdToken();
      const res = await fetch("http://127.0.0.1:8000/profile/update", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ account_type: nextValue ? "private" : "public" }),
      });

      if (!res.ok) throw new Error("Failed to update privacy");

      setIsPrivateAccount(nextValue);
      toast({
        description: nextValue ? "Switched to a private account" : "Switched to a public account",
        duration: 1500,
      });
    } catch (error) {
      console.error("Privacy toggle failed", error);
      toast({
        title: "Error",
        description: "Could not update account privacy",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const settingsSections = [
    {
      title: t('settings.account'),
      items: [
        { icon: User, label: t('settings.editProfile'), link: "/edit-profile" },
        { icon: Lock, label: t('settings.changePassword'), link: "/change-password" },
        { icon: CreditCard, label: "Payment History", link: "/payment-history" },
      ],
    },
    {
      title: t('settings.privacy'),
      items: [
        {
          icon: Users,
          label: t('settings.privateAccount'),
          toggle: true,
          checked: isPrivateAccount,
          onChange: togglePrivacy,
          description: isPrivateAccount 
            ? t('settings.privateAccountOn')
            : t('settings.privateAccountOff'),
        },
      ],
    },
    {
      title: t('settings.preferences'),
      items: [
        { icon: Bell, label: t('settings.notifications'), link: "/notifications" },
        {
          icon: Moon,
          label: t('settings.darkMode'),
          toggle: true,
          checked: resolvedTheme === "dark",
          onChange: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
        },
      ],
    },
    {
      title: "Features",
      items: [
        { icon: UserPlus, label: t('nav.becomePublisher'), link: "/become-publisher" },
      ],
    },
    {
      title: t('settings.support'),
      items: [
        { icon: Building2, label: "About Kirnagram", link: "/about-kirnagram" },
        { icon: HelpCircle, label: t('settings.helpCenter'), link: "/HelpCenter" },
        { icon: FileText, label: t('settings.termsOfService'), link: "/terms" },
        { icon: FileText, label: t('settings.privacyPolicy'), link: "/privacy" },
      ],
    },
  ];

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-2xl mx-auto pb-20 md:pb-0 overflow-x-hidden">
        <div className="flex items-center gap-3 mb-4 mt-4 ml-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold">{t('settings.title')}</h1>
        </div>
        
        {settingsSections.map((section) => (
          <div key={section.title} className="py-3">
            <h2 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {section.title}
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {section.items.map((item, index) => (
                <div key={item.label}>
                  {item.toggle ? (
                    <button
                      onClick={item.onChange}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <item.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm">{item.label}</span>
                          {item.description && (
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-11 h-6 rounded-full transition-colors ${
                          item.checked ? "bg-primary" : "bg-muted"
                        } relative flex-shrink-0`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                            item.checked ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </div>
                    </button>
                  ) : (
                    <Link
                      to={(item as any).link || "#"}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(item as any).value && (
                          <span className="text-sm text-muted-foreground">{(item as any).value}</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                  {index < section.items.length - 1 && (
                    <div className="h-px bg-border ml-12" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <div className="px-2 py-6 md:hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t('nav.logout')}
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground pb-8">
          kirnagram v1.0.0
        </p>
      </div>
    </MainLayout>
  );
};

export default Settings;
