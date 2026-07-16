import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bell, ArrowLeft, Clock, Trash2, UserCheck, TrendingUp, BadgeCheck, XCircle, Edit3, FileText, Zap, CreditCard, Flame, Gift } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useNotificationStore } from "@/store/notificationStore";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth-utils";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.kirnagram.com";

const Notifications = () => {
  const navigate = useNavigate();
  const { setNotifications, markAllAsRead, removeNotification, clearAll } = useNotificationStore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [serverNotifications, setServerNotifications] = useState<any[]>([]);
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadNotifications();
  }, [markAllAsRead]);

  const loadNotifications = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/notifications/recent?limit=100&hours=720`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const list = data.notifications || [];
        setServerNotifications(list);
        setNotifications(
          list.map((n: any) => ({
            id: n._id,
            user_id: n.from_user_id || n.user_id,
            user_name: n.from_user_name || n.user_name || "User",
            user_image: n.from_user_image || n.user_image || null,
            action: n.action || n.type || "notification",
            description: n.description || n.message || "",
            timestamp: n.timestamp,
            read: true,
          }))
        );
        markAllAsRead();
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      setDeleting(id);
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete notification");

      setServerNotifications((prev) => prev.filter((n) => n._id !== id));
      removeNotification(id);
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast({
        title: "Error",
        description: "Could not delete notification",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    try {
      setDeleting("all");
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/notifications/clear/all`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to clear notifications");

      setServerNotifications([]);
      clearAll();
    } catch (error) {
      console.error("Failed to clear notifications:", error);
      toast({
        title: "Error",
        description: "Could not clear notifications",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleApproveFollowRequest = async (fromUserId: string) => {
    try {
      setActionLoading(fromUserId);
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/follow/approve-request/${fromUserId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({
          description: "Follow request approved",
          duration: 1500,
        });
        loadNotifications();
      } else {
        throw new Error("Failed to approve");
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      toast({
        title: "Error",
        description: "Could not approve follow request",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectFollowRequest = async (fromUserId: string) => {
    try {
      setActionLoading(fromUserId);
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/follow/reject-request/${fromUserId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({
          description: "Follow request rejected",
          duration: 1500,
        });
        loadNotifications();
      } else {
        throw new Error("Failed to reject");
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      toast({
        title: "Error",
        description: "Could not reject follow request",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFollowBack = async (targetUserId: string) => {
    try {
      setActionLoading(targetUserId);
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/follow/follow-back/${targetUserId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          description: data.follow_status === "following" ? "Now following" : "Follow request sent",
          duration: 1500,
        });
        
        // Reload notifications to update button state
        await loadNotifications();
      } else {
        throw new Error("Failed to follow back");
      }
    } catch (error) {
      console.error("Failed to follow back:", error);
      toast({
        title: "Error",
        description: "Could not follow back",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getFallbackAvatar = (userImage: string | null, gender?: string | null) => {
    const hasCustomImage = userImage && 
      userImage.trim() !== "" && 
      !userImage.includes("default") && 
      !userImage.includes("placeholder") && 
      !userImage.startsWith("blob:");

    if (hasCustomImage) {
      const cacheBuster = userImage!.includes("?") ? "&" : "?";
      return `${userImage}${cacheBuster}t=${Date.now()}`;
    }
    
    if (gender === "male") return maleIcon;
    if (gender === "female") return femaleIcon;
    return profileIcon;
  };

  const getPostImage = (image?: string | null) => {
    if (!image) return null;
    const trimmed = image.trim();
    if (!trimmed || !trimmed.startsWith("http") || trimmed.includes("placeholder") || trimmed.includes("default")) {
      return null;
    }
    return trimmed;
  };

  const openPost = (notif: any) => {
    if (!notif?.post_id || !notif?.post_owner_id) return;
    navigate(`/posts/view/${notif.post_owner_id}`, {
      state: {
        initialPostId: notif.post_id,
      },
    });
  };

  if (!mounted) return null;

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-2xl mx-auto pb-20 md:pb-0 overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-muted rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Notifications
              </h1>
            </div>
            {serverNotifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs md:text-sm text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-lg hover:bg-muted/50"
                disabled={deleting === "all"}
              >
                {deleting === "all" ? "Clearing..." : "Clear All"}
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {serverNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Bell className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground mt-2">
              Updates from all users will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-1 px-2 md:px-4 py-4">
            {serverNotifications.map((notif) => {
              const isExpanded = expandedNotificationId === notif._id;
              const targetUserId = notif.from_user_id || notif.user_id;
              const isFollowRequest = notif.action === "follow_request";
              const isFollowApproved = notif.action === "follow_approved";
              const isStartedFollowing = notif.action === "started_following";
              const isPayoutChange = notif.type === "ai_creator_prompt_payout" || notif.action === "ai_creator_prompt_payout";
              const isAiCreatorStatus = notif.type === "ai_creator_status" || notif.action === "ai_creator_application_approved" || notif.action === "ai_creator_application_rejected";
              const isAiCreatorApproved = isAiCreatorStatus && (notif.status === "approved" || notif.action === "ai_creator_application_approved");
              const isAiCreatorPromptDecision =
                notif.type === "ai_creator_prompt" ||
                notif.action === "ai_creator_prompt_approved" ||
                notif.action === "ai_creator_prompt_rejected" ||
                notif.action === "ai_creator_prompt_modify" ||
                notif.action === "ai_creator_prompt_modified";
              const isPromptApproved = isAiCreatorPromptDecision && (notif.status === "approved" || notif.action === "ai_creator_prompt_approved");
              const isPromptRejected = isAiCreatorPromptDecision && (notif.status === "rejected" || notif.action === "ai_creator_prompt_rejected");
              const isPromptModify =
                isAiCreatorPromptDecision &&
                (notif.status === "modify" || notif.status === "modified" || notif.action === "ai_creator_prompt_modify" || notif.action === "ai_creator_prompt_modified");
              
              // 💳 New notification types for payments and credits
              const isCreditsBurned = notif.action === "credits_burned";
              const isCreditsPurchased = notif.action === "credits_purchased";
              const isAdPaymentVerified = notif.action === "ad_payment_verified";
              const isCreditSettingsUpdated = notif.action === "credit_settings_updated";
              const isPaymentNotification = isCreditsBurned || isCreditsPurchased || isAdPaymentVerified || isCreditSettingsUpdated;
              const isProfileUpdated = notif.action === "profile_updated";
              const isSystemNotification =
                isPayoutChange ||
                isAiCreatorStatus ||
                isAiCreatorPromptDecision ||
                isPaymentNotification ||
                isProfileUpdated ||
                !notif.from_user_name;
              const displayDescription =
                (notif.description || notif.message || "You have a new notification").toString().trim();
              const displaySenderName =
                (notif.from_user_name || notif.user_name || (isSystemNotification ? "Kirnagram Official" : "User")).toString().trim();
              
              // Determine button to show based on follow_status in notification
              const shouldShowFollowBack = isStartedFollowing && notif.follow_status === "none";
              const shouldShowRequestedStatus = isStartedFollowing && notif.follow_status === "requested";
              const shouldShowFollowingStatus = isStartedFollowing && notif.follow_status === "following";
              const shouldShowApprovalText = isFollowApproved; // Text only, no buttons

              return (
                <div
                  key={notif._id}
                  className="bg-muted/40 hover:bg-muted/60 rounded-lg p-3 md:p-4 transition-all border border-border/50 group"
                >
                  <div className="flex gap-3 items-center">
                    {/* Avatar - For system notifications, show system icon */}
                    {isSystemNotification ? (
                      <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center ${
                        isPaymentNotification 
                          ? isCreditsBurned 
                            ? "bg-red-500/20 border-red-500/30"
                            : isCreditsPurchased 
                            ? "bg-green-500/20 border-green-500/30"
                            : isAdPaymentVerified
                            ? "bg-blue-500/20 border-blue-500/30"
                            : "bg-purple-500/20 border-purple-500/30"
                          : "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30"
                      }`}>
                        {isPaymentNotification ? (
                          isCreditsBurned ? (
                            <Flame className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                          ) : isCreditsPurchased ? (
                            <Gift className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                          ) : isAdPaymentVerified ? (
                            <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                          ) : (
                            <Zap className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
                          )
                        ) : isAiCreatorPromptDecision ? (
                          isPromptApproved ? (
                            <BadgeCheck className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                          ) : isPromptModify ? (
                            <Edit3 className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                          ) : (
                            <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                          )
                        ) : isProfileUpdated ? (
                          <Edit3 className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                        ) : isAiCreatorStatus ? (
                          isAiCreatorApproved ? (
                            <BadgeCheck className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                          )
                        ) : (
                          <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        )}
                      </div>
                    ) : (
                      <Link to={targetUserId ? `/user/${targetUserId}` : "#"} className="flex-shrink-0">
                        <img
                          src={getFallbackAvatar(notif.from_user_image, notif.from_user_gender)}
                          alt={notif.from_user_name}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover ring-2 ring-primary/20"
                        />
                      </Link>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {isSystemNotification ? (
                        <div>
                          <p className="font-semibold text-foreground text-sm md:text-base">
                            {isPaymentNotification
                              ? "💳 Payment Update"
                              : isProfileUpdated
                              ? "Profile Update"
                              : isAiCreatorStatus || isAiCreatorPromptDecision
                              ? "Kirnagram Official"
                              : "Prompt Earnings Updated"}
                          </p>
                          <button
                            type="button"
                            onClick={() => setExpandedNotificationId((prev) => (prev === notif._id ? null : notif._id))}
                            className={`mt-0.5 block w-full text-left text-xs md:text-sm font-medium ${isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"} ${
                            isPaymentNotification 
                              ? isCreditsBurned 
                                ? "text-red-600 dark:text-red-400"
                                : isCreditsPurchased
                                ? "text-green-600 dark:text-green-400"
                                : isAdPaymentVerified
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-purple-600 dark:text-purple-400"
                              : "text-foreground"
                          }`}>
                            {displayDescription}
                          </button>
                          {displayDescription.length > 90 && (
                            <button
                              type="button"
                              onClick={() => setExpandedNotificationId((prev) => (prev === notif._id ? null : notif._id))}
                              className="mt-0.5 text-[11px] text-primary hover:underline"
                            >
                              {isExpanded ? "Show less" : "Show full message"}
                            </button>
                          )}
                          {isPaymentNotification && (isCreditsPurchased || isAdPaymentVerified || isCreditsBurned) && (
                            <button
                              onClick={() => navigate("/payment-history")}
                              className="mt-1 text-xs text-primary hover:underline"
                            >
                              View payment history
                            </button>
                          )}
                          {isAiCreatorPromptDecision && (
                            <button
                              onClick={() => navigate("/ai-creator/prompts")}
                              className="mt-1 text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Open My Prompts
                            </button>
                          )}
                          {(isAiCreatorPromptDecision || notif.type === "ai_creator_prompt_delete") && notif.prompt_id && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Prompt: {notif.prompt_id}
                            </p>
                          )}
                          {isPayoutChange && notif.prompt_id && (
                            <button
                              onClick={() => navigate("/ai-creator/earnings")}
                              className="mt-1 text-xs text-primary hover:underline"
                            >
                              View earnings
                            </button>
                          )}
                        </div>
                      ) : (
                        <Link to={targetUserId ? `/user/${targetUserId}` : "#"} className="block hover:opacity-80">
                          <p className="font-semibold text-foreground text-sm md:text-base">
                            {displaySenderName}
                          </p>
                          {notif.from_user_username && (
                            <p className="text-xs text-muted-foreground">@{notif.from_user_username}</p>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              setExpandedNotificationId((prev) => (prev === notif._id ? null : notif._id));
                            }}
                            className={`mt-0.5 block w-full text-left text-xs md:text-sm text-muted-foreground ${isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}
                          >
                            {displayDescription}
                          </button>
                          {displayDescription.length > 90 && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                setExpandedNotificationId((prev) => (prev === notif._id ? null : notif._id));
                              }}
                              className="mt-0.5 text-[11px] text-primary hover:underline"
                            >
                              {isExpanded ? "Show less" : "Show full message"}
                            </button>
                          )}
                        </Link>
                      )}
                      {notif.post_id && notif.post_owner_id && (
                        <button
                          onClick={() => openPost(notif)}
                          className="mt-1 text-xs text-primary hover:underline"
                        >
                          View post
                        </button>
                      )}
                    </div>

                    {/* Right Side: Buttons or Time/Delete */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getPostImage(notif.post_image) && (
                        <button
                          onClick={() => openPost(notif)}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden bg-muted border border-border/60"
                          title="View post"
                        >
                          <img
                            src={getPostImage(notif.post_image) || ""}
                            alt="Post"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      )}
                      {/* Follow Back Button */}
                      {shouldShowFollowBack && (
                        <button
                          onClick={() => handleFollowBack(notif.from_user_id)}
                          disabled={actionLoading === notif.from_user_id}
                          className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-semibold text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          Follow Back
                        </button>
                      )}

                      {/* Requested Status (after follow back to a private user) */}
                      {shouldShowRequestedStatus && (
                        <span className="px-4 py-1.5 bg-muted text-muted-foreground rounded-lg font-semibold text-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Requested
                        </span>
                      )}

                      {/* Following Status */}
                      {shouldShowFollowingStatus && (
                        <span className="px-4 py-1.5 bg-muted text-muted-foreground rounded-lg font-semibold text-xs flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          Following
                        </span>
                      )}

                      {/* Approve/Reject Buttons for Follow Requests */}
                      {isFollowRequest && (
                        <>
                          <button
                            onClick={() => handleApproveFollowRequest(notif.from_user_id)}
                            disabled={actionLoading === notif.from_user_id}
                            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-semibold text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleRejectFollowRequest(notif.from_user_id)}
                            disabled={actionLoading === notif.from_user_id}
                            className="px-4 py-1.5 bg-muted text-foreground rounded-lg font-semibold text-xs hover:bg-muted/80 transition-all disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}

                      {/* Approval Text (no buttons) */}
                      {shouldShowApprovalText && (
                        <span className="text-xs text-muted-foreground">Approved</span>
                      )}

                      {/* Time and Delete icon (only show when no action buttons) */}
                      {!shouldShowFollowBack && !shouldShowRequestedStatus && !shouldShowFollowingStatus && !isFollowRequest && !shouldShowApprovalText && (
                        <>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {(() => {
                              const date = new Date(notif.timestamp);
                              const now = new Date();
                              const diffMs = now.getTime() - date.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffHours = Math.floor(diffMs / 3600000);
                              const diffDays = Math.floor(diffMs / 86400000);

                              if (diffMins < 1) return "Just now";
                              if (diffMins < 60) return `${diffMins}m ago`;
                              if (diffHours < 24) return `${diffHours}h ago`;
                              if (diffDays < 7) return `${diffDays}d ago`;
                              return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                            })()}
                          </span>
                          <button
                            onClick={() => handleDeleteNotification(notif._id)}
                            disabled={deleting === notif._id}
                            className="p-1 rounded-md hover:bg-muted transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
