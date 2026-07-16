import { MainLayout } from "@/components/layout/MainLayout";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const packageGroups = [
  {
    title: "Standard Ad - Skippable after 30s",
    plans: [
      { name: "Monthly", price: "₹50", duration: "30 days", total: "₹1,485", save: "Save ₹165 (10% off)", featured: false },
      { name: "Quarterly", price: "₹44", duration: "90 days", total: "₹3,960", save: "Save ₹990 (20% off)", featured: true },
      { name: "Yearly", price: "₹39", duration: "365 days", total: "₹14,053", save: "Save ₹6,022 (30% off)", featured: false },
    ],
  },
  {
    title: "Full Video Ad - No Skip",
    plans: [
      { name: "Monthly", price: "₹68", duration: "30 days", total: "₹2,025", save: "Save ₹225 (10% off)", featured: false },
      { name: "Quarterly", price: "₹60", duration: "90 days", total: "₹5,400", save: "Save ₹1,350 (20% off)", featured: true },
      { name: "Yearly", price: "₹53", duration: "365 days", total: "₹19,163", save: "Save ₹8,212 (30% off)", featured: false },
    ],
  },
];

const featureList = ["Target specific audiences", "Real-time analytics", "Priority support", "Ad performance reports"];

const PublisherPackages = () => {
  const navigate = useNavigate();

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-6xl mx-auto pb-24 md:pb-10 px-4 md:px-6 overflow-x-hidden pt-4">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button onClick={() => navigate("/become-publisher")} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-semibold">Overview</button>
          <button onClick={() => navigate("/become-publisher/packages")} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold">Packages</button>
          <button onClick={() => navigate("/become-publisher/apply")} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-semibold">Apply</button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-2">Choose Your <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Package</span></h1>
          <p className="text-muted-foreground text-sm md:text-base">Package mode uses exact package timelines. Custom budget mode is available while publishing ads.</p>
        </div>

        <div className="space-y-10">
          {packageGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xl md:text-3xl font-display font-bold text-foreground text-center mb-5">{group.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                {group.plans.map((plan) => (
                  <div
                    key={`${group.title}-${plan.name}`}
                    className={plan.featured
                      ? "rounded-2xl p-5 md:p-6 bg-gradient-to-r from-primary to-secondary text-primary-foreground relative"
                      : "rounded-2xl p-5 md:p-6 bg-card border border-border"
                    }
                  >
                    {plan.featured && <span className="absolute top-3 right-3 text-[10px] md:text-xs px-2 py-1 rounded-full bg-white/30 font-semibold">Best Value</span>}
                    <p className={plan.featured ? "text-primary-foreground/90 text-sm mb-2" : "text-muted-foreground text-sm mb-2"}>{plan.name}</p>
                    <p className="text-4xl font-bold leading-none mb-2">{plan.price}<span className={plan.featured ? "text-base font-medium text-primary-foreground/90" : "text-base font-medium text-muted-foreground"}>/day</span></p>
                    <p className={plan.featured ? "text-sm text-primary-foreground/90" : "text-sm text-muted-foreground"}>{plan.duration} - Total {plan.total}</p>
                    <p className={plan.featured ? "text-sm text-primary-foreground/90 mb-4" : "text-sm text-muted-foreground mb-4"}>{plan.save}</p>

                    <div className="space-y-2 mb-5">
                      {featureList.map((feature) => (
                        <p key={feature} className="text-sm flex items-center gap-2">
                          <Check className={plan.featured ? "w-4 h-4 text-primary-foreground" : "w-4 h-4 text-muted-foreground"} />
                          <span className={plan.featured ? "text-primary-foreground" : "text-foreground"}>{feature}</span>
                        </p>
                      ))}
                    </div>

                    <button onClick={() => navigate("/become-publisher/apply")} className={plan.featured ? "w-full rounded-xl py-2.5 bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors" : "w-full rounded-xl py-2.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:opacity-95 transition-opacity"}>Apply</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default PublisherPackages;
