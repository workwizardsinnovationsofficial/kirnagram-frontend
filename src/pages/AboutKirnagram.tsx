import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Globe, ShieldCheck, Sparkles } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import kirnagramLogo from "@/assets/kirnagramlogo.png";
import wwiLogo from "@/assets/wwi.svg";

const AboutKirnagram = () => {
  const navigate = useNavigate();

  return (
    <MainLayout showRightSidebar={true}>
      <div className="w-full max-w-3xl ml-0 mr-auto pb-20 md:pb-0 overflow-x-hidden px-3 sm:px-4 md:px-5">
        <div className="flex items-center gap-3 mb-4 mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold">About Kirnagram</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <img
              src={kirnagramLogo}
              alt="Kirnagram Logo"
              className="w-14 h-14 rounded-xl object-cover border border-border/70"
            />
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold">Kirnagram</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                AI Creative Social Platform
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/90 p-1.5 flex items-center justify-center border border-border/60">
                <img
                  src={wwiLogo}
                  alt="Work Wizards Innovations Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Built By</p>
                <p className="text-sm sm:text-base font-extrabold text-primary">
                  Work Wizards Innovations Private Limited
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-foreground/90">
            <p>
              Kirnagram is an AI-powered social platform built for creators, communities, and brand discovery.
              It helps users share ideas, publish creative content, and collaborate in a trusted digital space.
            </p>
            <p>
              This platform is designed, developed, and maintained in an official and professional manner by
              <span className="ml-1 font-extrabold text-primary underline decoration-primary/60 underline-offset-2">
                Work Wizards Innovations Private Limited
              </span>
              .
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <div className="flex items-center gap-2 text-sm bg-muted/40 rounded-xl px-3 py-2.5">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">Work Wizards Innovations Private Limited</span>
            </div>
            <div className="flex items-center gap-2 text-sm bg-muted/40 rounded-xl px-3 py-2.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Official Product Build Partner for Kirnagram</span>
            </div>
            <div className="flex items-center gap-2 text-sm bg-muted/40 rounded-xl px-3 py-2.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Version: kirnagram v1.0.0</span>
            </div>
          </div>

          <a
            href="https://wwi.org.in"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Globe className="w-4 h-4" />
            Visit Work Wizards Innovations
          </a>
        </div>
      </div>
    </MainLayout>
  );
};

export default AboutKirnagram;