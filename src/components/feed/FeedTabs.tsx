import { useState } from "react";
import { cn } from "@/lib/utils";
import { Flame, Sparkles, Crown } from "lucide-react";

const tabs = [
  { id: "for-you", label: "For You", icon: Sparkles },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "pro", label: "Pro", icon: Crown },
];

interface FeedTabsProps {
  onTabChange?: (tabId: string) => void;
}

export function FeedTabs({ onTabChange }: FeedTabsProps) {
  const [activeTab, setActiveTab] = useState("for-you");

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-full w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabChange(tab.id)}
          className={cn(
            "feed-tab flex items-center gap-2",
            activeTab === tab.id ? "feed-tab-active" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <tab.icon className="w-4 h-4" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
