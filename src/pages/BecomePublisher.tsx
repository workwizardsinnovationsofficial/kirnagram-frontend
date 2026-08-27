import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Check, CircleDollarSign, Eye, Target, Video } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auth } from "@/firebase";

const benefits = [
  {
    icon: Target,
    title: "Target Specific Audiences",
    description: "Reach the right people based on demographics, interests, and behavior.",
  },
  {
    icon: CircleDollarSign,
    title: "Affordable Ad Pricing",
    description: "Start advertising with budgets as low as ₹550. No hidden fees.",
  },
  {
    icon: Video,
    title: "Video & Image Ads",
    description: "Create engaging video and image campaigns that capture attention.",
  },
  {
    icon: Eye,
    title: "Boost Brand Visibility",
    description: "Get your brand in front of thousands of active daily users.",
  },
];

const packageGroups = [
  {
    title: "Standard Ad - Skippable after 30s",
    plans: [
      {
        name: "Monthly",
        price: "₹50",
        duration: "30 days - Total ₹1,485",
        save: "Save ₹165 (10% off)",
        featured: false,
      },
      {
        name: "Quarterly",
        price: "₹44",
        duration: "90 days - Total ₹3,960",
        save: "Save ₹990 (20% off)",
        featured: true,
      },
      {
        name: "Yearly",
        price: "₹39",
        duration: "365 days - Total ₹14,053",
        save: "Save ₹6,022 (30% off)",
        featured: false,
      },
    ],
    features: [
      "Target specific audiences",
      "Real-time analytics",
      "Priority support",
      "Ad performance reports",
    ],
  },
  {
    title: "Full Video Ad - No Skip",
    plans: [
      {
        name: "Monthly",
        price: "₹68",
        duration: "30 days - Total ₹2,025",
        save: "Save ₹225 (10% off)",
        featured: false,
      },
      {
        name: "Quarterly",
        price: "₹60",
        duration: "90 days - Total ₹5,400",
        save: "Save ₹1,350 (20% off)",
        featured: true,
      },
      {
        name: "Yearly",
        price: "₹53",
        duration: "365 days - Total ₹19,163",
        save: "Save ₹8,212 (30% off)",
        featured: false,
      },
    ],
    features: [
      "Target specific audiences",
      "Real-time analytics",
      "Priority support",
      "Ad performance reports",
      "Non-skippable ads",
    ],
  },
];

const BecomePublisher = () => {
  const navigate = useNavigate();
  const { page } = useParams();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activePage = useMemo(() => {
    if (page === "packages" || page === "application") {
      return page;
    }
    return "landing";
  }, [page]);

  const goToLanding = () => navigate("/become-publisher");
  const goToPackages = () => navigate("/become-publisher/packages");
  const goToApplication = () => navigate("/become-publisher/application");

  const submitApplication = async () => {
    setSubmitMessage(null);
    setSubmitError(null);

    if (!fullName.trim() || !businessName.trim() || !businessType || !targetAudience) {
      setSubmitError("Please fill all required fields.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setSubmitError("Please log in again and try.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await user.getIdToken();

      const res = await fetch("http://127.0.0.1:8000/ads/publisher-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          business_name: businessName.trim(),
          business_type: businessType,
          target_audience: targetAudience,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to submit application");
      }

      setSubmitMessage("Application submitted successfully. Admin will review it soon.");
      setFullName("");
      setBusinessName("");
      setBusinessType("");
      setTargetAudience("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-6xl mx-auto pb-24 md:pb-10 px-4 md:px-6 overflow-x-hidden">
        <div className="flex justify-center gap-2 md:gap-3 mb-6 pt-3 md:pt-4">
          <button
            onClick={goToLanding}
            className={activePage === "landing"
              ? "px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold"
              : "px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-semibold"
            }
          >
            Overview
          </button>
          <button
            onClick={goToPackages}
            className={activePage === "packages"
              ? "px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold"
              : "px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-semibold"
            }
          >
            Packages
          </button>
          <button
            onClick={goToApplication}
            className={activePage === "application"
              ? "px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold"
              : "px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-semibold"
            }
          >
            Application
          </button>
        </div>

        {activePage === "landing" && (
          <section className="pt-2 md:pt-3">
            <div className="text-center mb-8 md:mb-10">
              <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-3 leading-tight">
                Grow Your Business with{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Kirnagram Ads</span>
              </h1>
              <p className="text-muted-foreground text-sm md:text-lg max-w-3xl mx-auto">
                Reach thousands of users and promote your products or services effectively.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 md:mb-12">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-2xl p-5 md:p-6 text-center shadow-sm"
                >
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
                <p className="text-sm text-muted-foreground font-medium mb-2">Standard Ad</p>
                <p className="text-4xl leading-none font-bold text-foreground mb-2">₹55<span className="text-lg text-muted-foreground font-medium">/day</span></p>
                <p className="text-sm text-muted-foreground">Skip after 30 seconds</p>
              </div>

              <div className="rounded-2xl p-7 text-center bg-gradient-to-r from-primary to-secondary text-primary-foreground relative overflow-hidden">
                <span className="absolute top-3 right-3 text-[10px] md:text-xs font-semibold px-2 py-1 rounded-full bg-white/30">
                  Popular
                </span>
                <p className="text-sm font-medium mb-2">Full Video Ad (No Skip)</p>
                <p className="text-4xl leading-none font-bold mb-2">₹75<span className="text-lg font-medium opacity-90">/day</span></p>
                <p className="text-sm opacity-90">Maximum engagement</p>
              </div>
            </div>

            <p className="text-center text-muted-foreground text-sm mb-6 md:mb-8">
              Minimum Budget: ₹550
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-10">
              <button
                onClick={goToApplication}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                Apply to Become a Publisher
              </button>
              <button
                onClick={goToPackages}
                className="px-8 py-3 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-muted/40 transition-colors"
              >
                View All Packages
              </button>
            </div>
          </section>
        )}

        {activePage === "packages" && (
          <section className="pt-2">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-2">
                Choose Your <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Package</span>
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Save more with longer commitments. All packages include full platform access.
              </p>
            </div>

            <div className="space-y-10">
              {packageGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xl md:text-3xl font-display font-bold text-foreground text-center mb-5">{group.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                    {group.plans.map((plan) => (
                      <div
                        key={`${group.title}-${plan.name}`}
                        className={plan.featured
                          ? "rounded-2xl p-5 md:p-6 bg-gradient-to-r from-primary to-secondary text-primary-foreground relative"
                          : "rounded-2xl p-5 md:p-6 bg-card border border-border"
                        }
                      >
                        {plan.featured && (
                          <span className="absolute top-3 right-3 text-[10px] md:text-xs px-2 py-1 rounded-full bg-white/30 font-semibold">
                            Best Value
                          </span>
                        )}

                        <p className={plan.featured ? "text-primary-foreground/90 text-sm mb-2" : "text-muted-foreground text-sm mb-2"}>{plan.name}</p>
                        <p className="text-4xl font-bold leading-none mb-2">{plan.price}<span className={plan.featured ? "text-base font-medium text-primary-foreground/90" : "text-base font-medium text-muted-foreground"}>/day</span></p>
                        <p className={plan.featured ? "text-sm text-primary-foreground/90" : "text-sm text-muted-foreground"}>{plan.duration}</p>
                        <p className={plan.featured ? "text-sm text-primary-foreground/90 mb-4" : "text-sm text-muted-foreground mb-4"}>{plan.save}</p>

                        <div className="space-y-2 mb-5">
                          {group.features.map((feature) => (
                            <p key={feature} className="text-sm flex items-center gap-2">
                              <Check className={plan.featured ? "w-4 h-4 text-primary-foreground" : "w-4 h-4 text-muted-foreground"} />
                              <span className={plan.featured ? "text-primary-foreground" : "text-foreground"}>{feature}</span>
                            </p>
                          ))}
                        </div>

                        <button className={plan.featured
                          ? "w-full rounded-xl py-2.5 bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
                          : "w-full rounded-xl py-2.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:opacity-95 transition-opacity"
                        }>
                          Get Started
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === "application" && (
          <section className="pt-6 md:pt-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-2">
                Publisher Application
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Fill in your details to start advertising on Kirnagram
              </p>
            </div>

            <div className="max-w-4xl mx-auto bg-card border border-border rounded-3xl p-5 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">
                <div>
                  <label className="block text-foreground font-semibold mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-foreground font-semibold mb-2">Business Name</label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-foreground font-semibold mb-2">Business Type</label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger className="w-full h-[50px] rounded-xl border-border bg-muted/40 text-foreground focus:ring-primary/40">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-5">
                <p className="block text-foreground font-semibold mb-3">Target Audience</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4">
                  {["Students", "Office Workers", "Business Owners", "Families", "Senior Citizens", "General Public"].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-foreground">
                      <input
                        type="radio"
                        name="targetAudience"
                        className="accent-primary"
                        value={item}
                        checked={targetAudience === item}
                        onChange={(e) => setTargetAudience(e.target.value)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-red-500 mb-3">{submitError}</p>
              )}
              {submitMessage && (
                <p className="text-sm text-green-500 mb-3">{submitMessage}</p>
              )}

              <button
                onClick={submitApplication}
                disabled={isSubmitting}
                className="w-full rounded-xl py-3.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
};

export default BecomePublisher;
