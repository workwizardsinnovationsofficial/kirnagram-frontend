import { MainLayout } from "@/components/layout/MainLayout";
import { CircleDollarSign, Eye, Target, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { publisherApi } from "@/lib/publisherApi";

const benefits = [
  {
    icon: Target,
    title: "Target Specific Audiences",
    description: "Reach the right people based on demographics, interests, and behavior.",
  },
  {
    icon: CircleDollarSign,
    title: "Affordable Ad Pricing",
    description: "Run ads from custom budgets or package pricing.",
  },
  {
    icon: Video,
    title: "Video & Image Ads",
    description: "Create engaging campaigns with media preview and call-to-action details.",
  },
  {
    icon: Eye,
    title: "Live Ad Insights",
    description: "Track views, detail clicks and campaign performance from dashboard.",
  },
];

const PublisherLanding = () => {
  const navigate = useNavigate();
  const [access, setAccess] = useState<{ is_publisher: boolean; status: string } | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await publisherApi.getAccess();
        setAccess(data);
      } catch {
        setAccess(null);
      }
    };
    run();
  }, []);

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-6xl mx-auto pb-24 md:pb-10 px-4 md:px-6 overflow-x-hidden">
        <div className="flex flex-wrap justify-center gap-3 mb-6 pt-4">
          <button onClick={() => navigate("/become-publisher")} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold">Overview</button>
          <button onClick={() => navigate("/become-publisher/packages")} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-semibold">Packages</button>
          <button onClick={() => navigate("/become-publisher/apply")} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-semibold">Apply</button>
        </div>

        <section className="pt-2 md:pt-3">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-3 leading-tight">
              Grow Your Business with <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Kirnagram Ads</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-lg max-w-3xl mx-auto">
              Apply as a publisher, define your audience and region, then run ad campaigns with package or custom budget payment modes.
            </p>
          </div>

          {access?.status === "pending" && (
            <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-amber-400/40 bg-amber-100/10 p-4 text-amber-500 text-sm">
              Your publisher application is under review.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 md:mb-12">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="bg-card border border-border rounded-2xl p-5 md:p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-secondary mx-auto mb-4 flex items-center justify-center">
                  <benefit.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-card border border-border rounded-2xl p-7 text-center">
              <p className="text-sm text-muted-foreground font-medium mb-2">Custom Budget</p>
              <p className="text-4xl leading-none font-bold text-foreground mb-2">Flexible</p>
              <p className="text-sm text-muted-foreground">Ad runs based on entered budget</p>
            </div>

            <div className="rounded-2xl p-7 text-center bg-gradient-to-r from-primary to-secondary text-primary-foreground relative overflow-hidden">
              <span className="absolute top-3 right-3 text-[10px] md:text-xs font-semibold px-2 py-1 rounded-full bg-white/30">Package</span>
              <p className="text-sm font-medium mb-2">Package Timeline</p>
              <p className="text-4xl leading-none font-bold mb-2">Exact Duration</p>
              <p className="text-sm opacity-90">Runs with selected package period</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-10">
            {access?.is_publisher ? (
              <button onClick={() => navigate("/publisher/dashboard")} className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold shadow-sm hover:opacity-95 transition-opacity">Open Ads Management</button>
            ) : (
              <button onClick={() => navigate("/become-publisher/apply")} className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold shadow-sm hover:opacity-95 transition-opacity">Apply to Become a Publisher</button>
            )}
            <button onClick={() => navigate("/become-publisher/packages")} className="px-8 py-3 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-muted/40 transition-colors">View All Packages</button>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default PublisherLanding;
