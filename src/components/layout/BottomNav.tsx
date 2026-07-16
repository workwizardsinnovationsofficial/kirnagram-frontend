import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Plus, User } from "lucide-react";
import aiCreatorIcon from "@/assets/ai_creator_icon.png";
import aiCreatorActiveIcon from "@/assets/ai-creator-icon-2.png";
import { cn } from "@/lib/utils";

interface NavItem {
  icon?: React.ElementType;
  iconSrc?: string;
  label: string;
  path: string;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Compass, label: "Discover", path: "/explore" },
  { icon: Plus, label: "Add Post", path: "/create", isCreate: true },
  { iconSrc: aiCreatorIcon, label: "AI Creator", path: "/ai-creator" },
  { icon: User, label: "Profile", path: "/profile" },
];

interface BottomNavProps {
  fromProfile?: boolean;
}

export function BottomNav({ fromProfile }: BottomNavProps = {}) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/profile") {
      return location.pathname === "/profile" || (fromProfile && location.pathname === "/posts");
    }
    if (path === "/") {
      if (fromProfile && location.pathname === "/posts") return false;
      return (
        location.pathname === "/" ||
        location.pathname === "/home" ||
        location.pathname === "/posts"
      );
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-pb">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const displayLabel = item.label === "Feeds" ? "Home" : item.label;
          const iconSrc = item.path === "/ai-creator" && active ? aiCreatorActiveIcon : item.iconSrc;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={(event) => {
                if (item.path === "/" && active) {
                  event.preventDefault();
                  window.dispatchEvent(new Event("kirnagram:home-refresh"));
                }
              }}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200",
                item.isCreate
                  ? "relative -mt-5"
                  : active
                    ? "text-orange-600 dark:text-orange-500"
                    : "text-zinc-400 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400"
              )}
            >
              {!item.isCreate && (
                <span
                  className={cn(
                    "absolute -top-2 h-0.5 w-8 rounded-full transition-all",
                    active ? "bg-orange-500" : "bg-transparent"
                  )}
                />
              )}

              {item.isCreate ? (
                <div
                  className={cn(
                    "w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30 transition-all",
                    active && "ring-2 ring-orange-400 ring-offset-2 ring-offset-background"
                  )}
                >
                  {item.iconSrc ? (
                    <img src={item.iconSrc} alt={item.label} className="w-6 h-6 object-contain" />
                  ) : (
                    <item.icon className="w-6 h-6 text-primary-foreground" />
                  )}
                </div>
              ) : item.iconSrc ? (
                <img
                  src={item.iconSrc}
                  alt={item.label}
                  className={cn(
                    "object-contain transition-all duration-200",
                    active ? "w-8 h-8 opacity-100" : "w-7 h-7 opacity-80"
                  )}
                />
              ) : (
                <item.icon className="w-5 h-5" />
              )}

              <span
                className={cn(
                  "text-[10px] font-medium",
                  item.isCreate && "mt-1",
                  active && !item.isCreate && "font-semibold"
                )}
              >
                {displayLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
