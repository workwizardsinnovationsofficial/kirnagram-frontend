import { MainLayout } from "@/components/layout/MainLayout";
import {
  Lock,
  MessageCircle,
  Phone,
  Rocket,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    title: "End-to-End Encryption",
    description: "Your private chats stay secure and protected.",
    icon: Lock,
  },
  {
    title: "Voice Calls",
    description: "Crystal clear conversations with low latency.",
    icon: Phone,
  },
  {
    title: "Video Calls",
    description: "Face-to-face calls with smooth HD streaming.",
    icon: Video,
  },
  {
    title: "Secure Messaging",
    description: "Fast, reliable, and safe communication.",
    icon: ShieldCheck,
  },
];

const MessengerComingSoon = () => {
  const navigate = useNavigate();

  return (
    <MainLayout showRightSidebar={true}>
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 pb-20 md:pb-6">
        <section className="relative overflow-hidden rounded-3xl border border-orange-300/20 bg-[radial-gradient(circle_at_18%_20%,rgba(251,146,60,0.24),transparent_45%),radial-gradient(circle_at_82%_14%,rgba(245,158,11,0.22),transparent_40%),linear-gradient(135deg,#1a0d06_0%,#2b1308_42%,#160902_100%)] p-5 sm:p-8 lg:p-10 text-white shadow-[0_22px_70px_rgba(69,31,8,0.55)]">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-orange-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-orange-100">
                <MessageCircle className="h-4 w-4" />
                Kirnagram Messenger
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight">
                Messaging Is
                <br />
                Coming Soon <span className="inline-block align-middle"><Rocket className="h-8 w-8 text-orange-300" /></span>
              </h1>

              <p className="mt-4 max-w-xl text-sm sm:text-base text-orange-100/90 leading-relaxed">
                Experience the future of communication with Kirnagram. End-to-end encrypted chats,
                voice calls, video calls, and voice notes are on the way.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate("/home")}
                  className="rounded-full border border-orange-300/55 bg-orange-400/20 px-5 py-2.5 text-sm font-semibold text-orange-50 shadow-[0_0_22px_rgba(251,146,60,0.35)] transition hover:-translate-y-0.5 hover:bg-orange-400/30"
                >
                  Coming Soon
                </button>
                <button
                  onClick={() => navigate("/discoverview")}
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:-translate-y-0.5 hover:bg-white/20"
                >
                  Explore Discover
                </button>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="relative mt-2 sm:mt-0">
                <div className="absolute -inset-6 rounded-[2.6rem] bg-orange-400/25 blur-2xl" />
                <div className="relative h-[360px] w-[188px] rounded-[2.2rem] border border-white/20 bg-gradient-to-b from-slate-900/95 to-slate-800/95 p-2 shadow-2xl ring-1 ring-white/10 sm:h-[390px] sm:w-[202px]">
                  <div className="h-full w-full rounded-[1.85rem] border border-white/10 bg-gradient-to-b from-orange-950/80 to-slate-900 px-3 py-4">
                    <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/20" />
                    <div className="space-y-3 text-[11px] text-white/80">
                      <div className="w-fit rounded-2xl rounded-bl-md bg-white/10 px-3 py-2">
                        Hey, is Messenger live?
                      </div>
                      <div className="ml-auto w-fit rounded-2xl rounded-br-md bg-orange-400/30 px-3 py-2">
                        Launching very soon.
                      </div>
                      <div className="w-fit rounded-2xl rounded-bl-md bg-white/10 px-3 py-2">
                        Voice and video too?
                      </div>
                      <div className="ml-auto w-fit rounded-2xl rounded-br-md bg-amber-400/30 px-3 py-2">
                        Yes. Secure, fast, and smooth.
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-center gap-3 text-white/75">
                      <Phone className="h-4 w-4" />
                      <Video className="h-4 w-4" />
                      <Lock className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="absolute -left-14 top-12 rounded-xl border border-orange-300/30 bg-orange-300/20 px-3 py-1.5 text-xs font-medium text-orange-100 backdrop-blur">
                  Encrypted
                </div>
                <div className="absolute -right-12 top-24 rounded-xl border border-amber-300/30 bg-amber-300/20 px-3 py-1.5 text-xs font-medium text-amber-100 backdrop-blur">
                  Voice Calls
                </div>
                <div className="absolute -right-10 bottom-16 rounded-xl border border-orange-300/30 bg-orange-300/20 px-3 py-1.5 text-xs font-medium text-orange-100 backdrop-blur">
                  Video
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-10">
            <h2 className="mb-4 text-center text-2xl font-bold">Features</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/15"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                    <item.icon className="h-5 w-5 text-orange-200" />
                  </div>
                  <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>
                  <p className="mt-1 text-xs text-orange-100/85 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default MessengerComingSoon;
