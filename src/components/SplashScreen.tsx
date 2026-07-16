import React, { useEffect, useState } from "react";
import kirnagramLogo from "@/assets/kirnagramlogo.png";
import "@/index.css";

export default function SplashScreen() {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHide(true), 1800); // 1.8s animation
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500 ${
        hide ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "#fff" }}
    >
      <img
        src={kirnagramLogo}
        alt="Kirnagram Logo"
        className="splash-logo"
        style={{ width: 120, height: 120 }}
      />
    </div>
  );
}
