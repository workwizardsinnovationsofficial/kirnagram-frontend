import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, UserPlus, UserCheck, Clock, X } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { auth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.kirnagram.com";

type TabType = "followers" | "following";

const FollowList = () => {
  const { userId, tab } = useParams<{ userId: string; tab: TabType }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>(tab || "followers");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (tab && (tab === "followers" || tab === "following")) {
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    loadUsers();
  }, [activeTab, userId, currentUser]);

  const loadUsers = async () => {
    if (!currentUser || !userId) return;

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      
      // Load profile user info first to check privacy
      if (!profileUser) {
        const profileRes = await fetch(`${API_BASE}/follow/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfileUser(profileData);
          
          // Check if private account and not following
          const isPrivate = profileData.account_type === "private";
          const isFollowing = profileData.follow_status === "following";
          const isOwnProfile = currentUser.uid === userId;
          
          // If private and not following (and not own profile), don't load list
          if (isPrivate && !isFollowing && !isOwnProfile) {
            setUsers([]);
            setLoading(false);
            return;
          }
        }
      }
      
      const endpoint = activeTab === "followers" 
        ? `${API_BASE}/follow/followers/${userId}`
        : `${API_BASE}/follow/following/${userId}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        
        // Add follow_status to each user
        const usersWithStatus = await Promise.all(
          (data[activeTab] || []).map(async (user: any) => {
            const statusRes = await fetch(`${API_BASE}/follow/${user.firebase_uid}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              return { ...user, follow_status: statusData.follow_status };
            }
            return { ...user, follow_status: "none" };
          })
        );

        setUsers(usersWithStatus);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollowAction = async (targetUser: any) => {
    if (!currentUser || actionLoading) return;
    const targetId = targetUser?.firebase_uid || targetUser?._id || targetUser?.public_id || targetUser?.username;
    if (!targetId) return;

    setActionLoading(targetId);
    try {
      const token = await currentUser.getIdToken();

      if (targetUser.follow_status === "following" || targetUser.follow_status === "requested") {
        // Unfollow
        const res = await fetch(`${API_BASE}/follow/unfollow/${targetId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          targetUser.follow_status = "none";
          setUsers([...users]);
          toast({
            description: "Unfollowed",
            duration: 1500,
          });
        }
      } else if (targetUser.follow_status === "pending") {
        // Follow back
        const res = await fetch(`${API_BASE}/follow/follow-back/${targetId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          targetUser.follow_status = data.follow_status;
          setUsers([...users]);
          toast({
            description: data.follow_status === "following" ? "Now following" : "Follow request sent",
            duration: 1500,
          });
        }
      } else {
        // Send follow request
        const res = await fetch(`${API_BASE}/follow/send-request/${targetId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          targetUser.follow_status = data.follow_status;
          setUsers([...users]);
          toast({
            description: data.follow_status === "following" ? "Now following" : "Follow request sent",
            duration: 1500,
          });
        }
      }
    } catch (error) {
      console.error("Follow action failed:", error);
      toast({
        title: "Error",
        description: "Action failed",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFollower = async (followerUser: any) => {
    if (!currentUser || actionLoading) return;

    setActionLoading(followerUser.firebase_uid);
    try {
      const token = await currentUser.getIdToken();

      // Remove follower by deleting their follow relationship
      const res = await fetch(`${API_BASE}/follow/remove-follower/${followerUser.firebase_uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Remove from list
        setUsers(users.filter(u => u.firebase_uid !== followerUser.firebase_uid));
        toast({
          description: "Follower removed",
          duration: 1500,
        });
      } else {
        throw new Error("Failed to remove follower");
      }
    } catch (error) {
      console.error("Remove follower failed:", error);
      toast({
        title: "Error",
        description: "Could not remove follower",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getProfileImage = (user: any) => {
    const img = user.image_name as string | undefined;
    const hasCustomImage = img && 
      img.trim() !== "" && 
      !img.includes("default") && 
      !img.includes("placeholder") && 
      !img.startsWith("blob:");

    if (hasCustomImage) {
      const cacheBuster = img.includes("?") ? "&" : "?";
      return `${img}${cacheBuster}t=${Date.now()}`;
    }

    if (user.gender === "male") return maleIcon;
    if (user.gender === "female") return femaleIcon;
    return profileIcon;
  };

  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    navigate(`/user/${userId}/${newTab}`);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-2xl mx-auto pb-20 md:pb-0 overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 py-3">
            <button
              onClick={handleBackClick}
              className="p-2 hover:bg-muted rounded-lg transition-all mr-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-display font-bold">
                {profileUser?.username || profileUser?.full_name || "User"}
              </h1>
              <p className="text-xs text-muted-foreground">
                @{profileUser?.username || "username"}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-border">
            <button
              onClick={() => handleTabChange("followers")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === "followers"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Followers
              {activeTab === "followers" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("following")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === "following"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Following
              {activeTab === "following" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* User List */}
        <div className="px-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : profileUser?.account_type === "private" && 
             profileUser?.follow_status !== "following" && 
             currentUser?.uid !== userId ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <UserCheck className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-2">This Account is Private</p>
              <p className="text-sm text-muted-foreground">
                Follow this account to see their {activeTab}
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">
                No {activeTab} yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => {
                const isCurrentUser = currentUser?.uid === user.firebase_uid;
                const isViewingOwnFollowers = currentUser?.uid === userId && activeTab === "followers";

                return (
                  <div
                    key={user.firebase_uid}
                    className="flex items-center justify-between py-2"
                  >
                    <Link
                      to={`/user/${user.firebase_uid}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <img
                        src={getProfileImage(user)}
                        alt={user.full_name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{user.username || user.full_name?.toLowerCase().replace(" ", "")}
                        </p>
                        {user.account_type === "private" && (
                          <p className="text-xs text-primary mt-0.5">Private</p>
                        )}
                      </div>
                    </Link>

                    {isViewingOwnFollowers ? (
                      // Show X button to remove follower (Instagram style)
                      <button
                        onClick={() => handleRemoveFollower(user)}
                        disabled={actionLoading === user.firebase_uid}
                        className="flex-shrink-0 ml-2 p-2 hover:bg-muted rounded-lg transition-all disabled:opacity-50"
                        title="Remove follower"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    ) : !isCurrentUser && (
                      <div className="flex-shrink-0 ml-2">
                        {user.follow_status === "following" ? (
                          <button
                            onClick={() => handleFollowAction(user)}
                            disabled={actionLoading === user.firebase_uid}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80 transition-all disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Following
                          </button>
                        ) : user.follow_status === "requested" ? (
                          <button
                            onClick={() => handleFollowAction(user)}
                            disabled={actionLoading === user.firebase_uid}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-muted text-foreground font-semibold text-xs hover:bg-muted/80 transition-all disabled:opacity-50"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Requested
                          </button>
                        ) : user.follow_status === "pending" ? (
                          <button
                            onClick={() => handleFollowAction(user)}
                            disabled={actionLoading === user.firebase_uid}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-semibold text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Follow Back
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFollowAction(user)}
                            disabled={actionLoading === user.firebase_uid}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-semibold text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Follow
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default FollowList;
