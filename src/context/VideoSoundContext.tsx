import { createContext, useContext, useState } from "react";

interface VideoSoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
}

const VideoSoundContext = createContext<VideoSoundContextType | null>(null);

export function VideoSoundProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <VideoSoundContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </VideoSoundContext.Provider>
  );
}

export function useVideoSound() {
  const context = useContext(VideoSoundContext);
  if (!context) {
    throw new Error("useVideoSound must be used inside VideoSoundProvider");
  }
  return context;
}
