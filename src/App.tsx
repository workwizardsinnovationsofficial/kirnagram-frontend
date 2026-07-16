import TwoFactor from "./pages/TwoFactor";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Trending from "./pages/Trending";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import { auth } from "@/firebase";
import Index from "./pages/Index";
import Login from "./pages/LoginNew";
import Signup from "./pages/SignupNew";
import ForgotPassword from "./pages/ForgotPassword";
import Explore from "./pages/Explore";
import Leaderboard from "./pages/Leaderboard";
import DiscoverView from "./pages/DiscoverView";
import MessengerComingSoon from "./pages/MessengerComingSoon";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import UsernameRoute from "./pages/UsernameRoute";
import FollowList from "./pages/FollowList";
import SuggestedUsersAll from "./pages/SuggestedUsersAll";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import PaymentHistory from "./pages/PaymentHistory";
import Notifications from "./pages/Notifications";
import AICreator from "./pages/AICreator";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import AboutKirnagram from "./pages/AboutKirnagram";
import CreatorEarnings from "./pages/CreatorEarnings";
import CreatorPrompts from "./pages/CreatorPrompts";
import AddNewPrompt from "./pages/AddNewPrompt";
import EditCreatorProfile from "./pages/EditCreatorProfile";
import PublisherLanding from "./pages/PublisherLanding";
import PublisherPackages from "./pages/PublisherPackages";
import PublisherApply from "./pages/PublisherApply";
import PublisherAdsDashboard from "./pages/PublisherAdsDashboard";
import PublisherBusinessProfile from "./pages/PublisherBusinessProfile";
import NotFound from "./pages/NotFound";
import HelpCenter from "./pages/HelpCenter";
import AddPostPage from "./pages/AddPostPage";
import PostsView from "./pages/PostsView";
import StoryUpload from "@/components/StoryUpload";
import StoryView from "@/components/StoryView";
import Credits from "./pages/Credits";
import Remix from "./pages/Remix";
import RemixViewer from "./pages/RemixViewer";
import RemixDetails from "./pages/RemixDetails";
import ChangePassword from "./pages/ChangePassword";
import { VideoSoundProvider } from "@/context/VideoSoundContext";
import ActivityTracker from "@/components/ActivityTracker";
import "./glass.css";

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check JWT token in localStorage
    const accessToken = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");
    
    if (accessToken && userId) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check JWT token in localStorage
    const accessToken = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");
    
    if (accessToken && userId) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return children;
};







const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <VideoSoundProvider>
            <Sonner />
            {showSplash && <SplashScreen />}
            {!showSplash && (
              <BrowserRouter>
                <ActivityTracker />
                <Routes>
                  <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
                  <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                  <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />

                  <Route path="/home" element={<PrivateRoute><Index /></PrivateRoute>} />
                  <Route path="/explore" element={<PrivateRoute><Explore /></PrivateRoute>} />
                  <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                  <Route path="/user/:userId" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
                  <Route path="/user/:userId/:tab" element={<PrivateRoute><FollowList /></PrivateRoute>} />
                  <Route path="/suggested-users" element={<PrivateRoute><SuggestedUsersAll /></PrivateRoute>} />
                  <Route path="/suggestted-users" element={<PrivateRoute><SuggestedUsersAll /></PrivateRoute>} />
                  <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
                  <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
                  <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                  <Route path="/payment-history" element={<PrivateRoute><PaymentHistory /></PrivateRoute>} />
                  <Route path="/ai-creator" element={<PrivateRoute><AICreator /></PrivateRoute>} />
                  <Route path="/ai-creator/earnings" element={<PrivateRoute><CreatorEarnings /></PrivateRoute>} />
                  <Route path="/ai-creator/prompts" element={<PrivateRoute><CreatorPrompts /></PrivateRoute>} />
                  <Route path="/ai-creator/add-prompt" element={<PrivateRoute><AddNewPrompt /></PrivateRoute>} />
                  <Route path="/ai-creator/edit-profile" element={<PrivateRoute><EditCreatorProfile /></PrivateRoute>} />
                  <Route path="/privacy" element={<PrivateRoute><Privacy /></PrivateRoute>} />
                  <Route path="/terms" element={<PrivateRoute><Terms /></PrivateRoute>} />
                  <Route path="/about-kirnagram" element={<PrivateRoute><AboutKirnagram /></PrivateRoute>} />
                  <Route path="/become-publisher" element={<PrivateRoute><PublisherLanding /></PrivateRoute>} />
                  <Route path="/become-publisher/packages" element={<PrivateRoute><PublisherPackages /></PrivateRoute>} />
                  <Route path="/become-publisher/apply" element={<PrivateRoute><PublisherApply /></PrivateRoute>} />
                  <Route path="/become-publisher/application" element={<Navigate to="/become-publisher/apply" replace />} />
                  <Route path="/publisher/dashboard" element={<PrivateRoute><PublisherAdsDashboard /></PrivateRoute>} />
                  <Route path="/publisher/business-profile/:publisherId" element={<PrivateRoute><PublisherBusinessProfile /></PrivateRoute>} />
                  <Route path="/create" element={<PrivateRoute><AddPostPage /></PrivateRoute>} />
                  <Route path="/credits" element={<PrivateRoute><Credits /></PrivateRoute>} />
                  <Route path="/HelpCenter" element={<PrivateRoute><HelpCenter /></PrivateRoute>} />
                  {/* Remix generation page (keep for prompt-based remix) */}
                  <Route path="/remix/:promptId" element={<PrivateRoute><Remix /></PrivateRoute>} />
                  {/* View existing remix by ID */}
                  <Route path="/remix-details/:remixId" element={<PrivateRoute><RemixDetails /></PrivateRoute>} />
                  <Route path="/trending" element={<PrivateRoute><Trending /></PrivateRoute>} />
                  <Route
                    path="/remix-view"
                    element={
                      <PrivateRoute>
                        <RemixViewer />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/discoverview/:postId?"
                    element={
                      <PrivateRoute>
                        <DiscoverView />
                      </PrivateRoute>
                    }
                  />
                  <Route path="/messenger-coming-soon" element={<PrivateRoute><MessengerComingSoon /></PrivateRoute>} />
                  <Route path="/posts" element={<PrivateRoute><PostsView /></PrivateRoute>} />
                  <Route path="/posts/view/:userId" element={<PrivateRoute><PostsView /></PrivateRoute>} />
                  <Route path="/story/upload" element={<PrivateRoute><StoryUpload /></PrivateRoute>} />
                  <Route path="/story/view" element={<PrivateRoute><StoryView /></PrivateRoute>} />
                  <Route path="/story/view/:storyId" element={<PrivateRoute><StoryView /></PrivateRoute>} />
                  <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
                  <Route path="/two-factor" element={<PrivateRoute><TwoFactor /></PrivateRoute>} />
                  {/* Username route (Instagram-style): must be before catch-all */}
                  <Route path="/:username" element={<PrivateRoute><UsernameRoute /></PrivateRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            )}
          </VideoSoundProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
