import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Crown, Trophy, Medal, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { auth } from "@/firebase";
import profileIcon from "@/assets/profileicon.png";
import maleIcon from "@/assets/maleicon.png";
import femaleIcon from "@/assets/femaleicon.png";

type UserSummary = {
  firebase_uid: string;
  username?: string;
  public_id?: string;
  full_name?: string;
  image_name?: string;
  gender?: string;
  is_creator?: boolean;
  total_remix_count?: number;
};

const API_BASE = "http://localhost:8000";

const getDisplayName = (user: UserSummary) => {
  return user.full_name || user.username || user.public_id || "Creator";
};

const getHandle = (user: UserSummary) => {
  const handle = user.username || user.public_id || "user";
  return handle.startsWith("@") ? handle : `@${handle}`;
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [userProfiles, setUserProfiles] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(true);

    // Refresh leaderboard every minute so remix totals stay current.
    const intervalId = window.setInterval(() => {
      fetchData(false);
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const fetchData = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        if (showLoader) {
          setLoading(false);
        }
        return;
      }

      const token = await currentUser.getIdToken();

      // Fetch all AI creators with their total remix counts
      const creatorsRes = await fetch(`${API_BASE}/profile/creators/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const creatorsData = await creatorsRes.json();
      
      if (Array.isArray(creatorsData)) {
        // Sort creators by total_remix_count
        const sortedCreators = creatorsData.sort((a: UserSummary, b: UserSummary) => 
          (b.total_remix_count || 0) - (a.total_remix_count || 0)
        );
        setUserProfiles(sortedCreators);
      } else {
        setUserProfiles([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const getProfileImage = (user: UserSummary) => {
    if (user.image_name) {
      // Check if it's already an external URL (starts with http)
      if (user.image_name.startsWith("http")) {
        return user.image_name;
      }
      // Otherwise treat it as a local filename
      return `${API_BASE}/profile/avatar/${user.image_name}`;
    }
    if (user.gender === "male") return maleIcon;
    if (user.gender === "female") return femaleIcon;
    return profileIcon;
  };

  // Calculate creator stats using pre-calculated remix counts from backend
  const creatorStats = (Array.isArray(userProfiles) ? userProfiles : Object.values(userProfiles))
    .filter((user: any) => user.is_creator)
    .map((creator: any, index: number) => ({ 
      ...creator, 
      remixCount: creator.total_remix_count || 0,
      rank: index + 1 
    }))
    .sort((a: any, b: any) => b.remixCount - a.remixCount)
    .map((creator: any, index: number) => ({ ...creator, rank: index + 1 }));

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />;
    if (index === 1) return <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-500 dark:text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />;
    return null;
  };

  return (
    <MainLayout showRightSidebar={true}>
      <div className="w-full min-h-screen pb-24 md:pb-8 bg-background">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="sticky md:relative top-0 md:top-auto z-50 md:z-10 bg-background/95 backdrop-blur-sm py-3 sm:py-6 mb-4 sm:mb-6 border-b border-border">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-secondary">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Top 3 Podium */}
          {!loading && creatorStats.length >= 3 && (
            <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4 items-end">
              {/* 2nd Place */}
              <div
                onClick={() => navigate(`/user/${creatorStats[1].firebase_uid}`)}
                className="flex flex-col items-center cursor-pointer group"
              >
                <div className="relative mb-2 sm:mb-3">
                  <div className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center z-10">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">2</span>
                  </div>
                  <img
                    src={getProfileImage(creatorStats[1])}
                    alt={creatorStats[1].full_name || creatorStats[1].username || "Creator"}
                    className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-gray-400 group-hover:scale-110 transition-transform"
                  />
                </div>
                <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-t-lg sm:rounded-t-2xl w-full p-2 sm:p-4 text-center">
                  <p className="font-semibold text-xs sm:text-base text-gray-900 truncate">
                    {getDisplayName(creatorStats[1])}
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5 sm:mt-1">{creatorStats[1].remixCount} remixes</p>
                </div>
              </div>

              {/* 1st Place */}
              <div
                onClick={() => navigate(`/user/${creatorStats[0].firebase_uid}`)}
                className="flex flex-col items-center cursor-pointer group transform scale-100 sm:scale-110"
              >
                <div className="relative mb-2 sm:mb-3">
                  <Crown className="absolute -top-4 sm:-top-6 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 animate-bounce" />
                  <div className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center z-10 shadow-lg">
                    <span className="text-xs sm:text-base font-bold text-gray-900 dark:text-white">1</span>
                  </div>
                  <img
                    src={getProfileImage(creatorStats[0])}
                    alt={creatorStats[0].full_name || creatorStats[0].username || "Creator"}
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-yellow-400 group-hover:scale-110 transition-transform shadow-xl"
                  />
                </div>
                <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-t-lg sm:rounded-t-2xl w-full p-2 sm:p-4 text-center shadow-lg">
                  <p className="font-bold text-xs sm:text-base text-gray-900 truncate">
                    {getDisplayName(creatorStats[0])}
                  </p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5 sm:mt-1">{creatorStats[0].remixCount} remixes</p>
                </div>
              </div>

              {/* 3rd Place */}
              <div
                onClick={() => navigate(`/user/${creatorStats[2].firebase_uid}`)}
                className="flex flex-col items-center cursor-pointer group"
              >
                <div className="relative mb-2 sm:mb-3">
                  <div className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center z-10">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">3</span>
                  </div>
                  <img
                    src={getProfileImage(creatorStats[2])}
                    alt={creatorStats[2].full_name || creatorStats[2].username || "Creator"}
                    className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-amber-600 group-hover:scale-110 transition-transform"
                  />
                </div>
                <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-t-lg sm:rounded-t-2xl w-full p-2 sm:p-4 text-center">
                  <p className="font-semibold text-xs sm:text-base text-gray-900 truncate">
                    {getDisplayName(creatorStats[2])}
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5 sm:mt-1">{creatorStats[2].remixCount} remixes</p>
                </div>
              </div>
            </div>
          )}

          {/* Rest of Rankings */}
          {!loading && creatorStats.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-display font-semibold mb-4 px-2">All Rankings</h2>
              {creatorStats.map((creator, index) => (
                <div
                  key={creator.firebase_uid}
                  onClick={() => navigate(`/user/${creator.firebase_uid}`)}
                  className={cn(
                    "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all hover:scale-[1.02]",
                    index < 3 && "shadow-md"
                  )}
                >
                  {/* Rank Badge on Left */}
                  <div
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 shadow-md",
                      index === 0 && "bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900 dark:text-white",
                      index === 1 && "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900",
                      index === 2 && "bg-gradient-to-br from-amber-600 to-amber-700 text-gray-900 dark:text-white",
                      index >= 3 && "bg-primary/10 border-2 border-primary text-primary text-xs sm:text-base"
                    )}
                  >
                    {index < 3 ? (
                      getRankIcon(index)
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Profile Image - Larger and More Visible */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={getProfileImage(creator)}
                      alt={getDisplayName(creator)}
                      className={cn(
                        "rounded-full object-cover border-2",
                        index < 3 ? "w-14 h-14 sm:w-16 sm:h-16 border-primary shadow-lg" : "w-12 h-12 sm:w-14 sm:h-14 border-border"
                      )}
                    />
                    {index < 3 && (
                      <div className="absolute -bottom-1 -right-1">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">
                      {getDisplayName(creator)}
                    </p>
                    <p className="text-xs text-muted-foreground">{getHandle(creator)}</p>
                  </div>

                  {/* Remix Count */}
                  <div className="text-right flex-shrink-0 min-w-fit">
                    <p className="text-lg sm:text-2xl font-bold text-primary">{creator.remixCount}</p>
                    <p className="text-xs text-muted-foreground">remixes</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && creatorStats.length === 0 && (
            <div className="text-center py-12 sm:py-20">
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-base sm:text-lg text-muted-foreground">No AI creators found yet.</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Check back later for rankings!</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Leaderboard;
