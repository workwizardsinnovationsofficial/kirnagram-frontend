import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Database,
  Sparkles,
  Users,
  EyeOff,
  Server,
  Share2,
  Calendar,
  Trash2,
  Cookie,
  Globe,
  Scale,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

export default function Privacy() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/settings");
    }
  };

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 pb-24 md:pb-12 overflow-x-hidden space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-muted/50 border border-border/50 bg-card/60 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground">Kirnagram Legal & Policies</p>
          </div>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                Kirnagram Privacy & Security
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">
                PRIVACY POLICY
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Effective Date: June 2026 | Last Updated: June 2026
              </p>
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        {/* 1. Introduction */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              1
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Introduction
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground pt-1">
            <p className="font-medium text-foreground">Welcome to Kirnagram.</p>
            <p>
              Kirnagram is an AI Creative Social Platform committed to protecting user privacy, creator
              intellectual property, and personal information. This Privacy Policy explains how we collect,
              use, process, store, and protect information when you access or use the Kirnagram website,
              mobile applications, and related services.
            </p>
            <p className="p-3 rounded-xl bg-muted/40 border border-border/60 text-foreground font-medium">
              By using Kirnagram, you agree to the practices described in this Privacy Policy.
            </p>
          </div>
        </section>

        {/* 2. Information We Collect */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              2
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Information We Collect
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            We may collect the following categories of information:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Information */}
            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2.5">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <h3>Account Information</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Full Name",
                  "Username",
                  "Email Address",
                  "Profile Information",
                  "Account Credentials",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Usage Information */}
            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2.5">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Database className="w-4 h-4 text-primary shrink-0" />
                <h3>Usage Information</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Device Information",
                  "Browser Information",
                  "IP Address",
                  "Operating System",
                  "Platform Activity",
                  "Feature Usage Statistics",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Creator Content Information */}
            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2.5">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <h3>Creator Content Information</h3>
              </div>
              <p className="text-xs text-muted-foreground italic">
                For platform functionality, creators may submit:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "AI Prompts",
                  "Template Structures",
                  "AI Workflows",
                  "Template Configurations",
                  "Creator Metadata",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* User Content Information */}
            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2.5">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <h3>User Content Information</h3>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Users may upload:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Reference Images",
                  "Input Text",
                  "Posts",
                  "Comments",
                  "Profile Content",
                  "Generated Outputs",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 3. How We Use Information */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              3
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              How We Use Information
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">We use information to:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {[
              "Create and manage user accounts",
              "Provide platform services",
              "Generate AI content",
              "Process transactions",
              "Prevent fraud and abuse",
              "Improve platform performance",
              "Maintain security",
              "Provide customer support",
              "Review creator submissions",
              "Operate creator reward systems",
              "Comply with legal obligations",
            ].map((useCase, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Creator Prompt Protection */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              4
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Creator Prompt Protection
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kirnagram recognizes creator prompts, workflows, and template structures as valuable intellectual
            property. To protect creators:
          </p>
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Creator prompts are not publicly displayed.",
                "End users cannot directly access creator prompts.",
                "Creator workflows remain protected within platform systems.",
                "Prompt access is restricted to authorized personnel only when necessary for moderation, security, legal compliance, or platform operations.",
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <EyeOff className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kirnagram takes reasonable technical and organizational measures to protect creator assets from
            unauthorized access.
          </p>
        </section>

        {/* 5. Zero-Training Commitment */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              5
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Zero-Training Commitment
            </h2>
          </div>
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <p className="text-sm font-medium text-foreground">
              Kirnagram is committed to protecting creator and user content. Kirnagram does not use:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              {[
                "Creator Prompts",
                "Creator Templates",
                "Creator Workflows",
                "User Reference Images",
                "User Uploaded Content",
                "Generated Outputs",
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-primary/20">
              to train, retrain, or improve proprietary AI foundation models unless explicitly disclosed and consented
              to by users. Submitted content is processed solely for generation, moderation, platform functionality,
              security, quality review, and legal compliance purposes.
            </p>
          </div>
        </section>

        {/* 6. Third-Party AI Services */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              6
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Third-Party AI Services
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kirnagram may utilize third-party AI providers and cloud infrastructure services. Examples may include:
          </p>
          <div className="flex flex-wrap gap-2 pt-1 pb-1">
            {[
              "Google Cloud",
              "Vertex AI",
              "Gemini",
              "OpenAI",
              "Other approved AI providers",
            ].map((provider, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-xs font-medium text-foreground"
              >
                {provider}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These providers process requests solely to deliver requested AI services. Third-party providers do not
            receive ownership of creator intellectual property. Users may also be subject to applicable policies of
            those providers.
          </p>
        </section>

        {/* 7. Data Sharing & Disclosure */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              7
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Data Sharing & Disclosure
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kirnagram may share limited information with:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Cloud Service Providers",
              "Payment Processors",
              "Security Providers",
              "Analytics Providers",
              "Legal Authorities when required by law",
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2.5">
                <Share2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-sm text-foreground font-medium">
            Kirnagram does not sell personal information to third parties. Kirnagram does not sell creator prompts,
            creator templates, creator workflows, or creator intellectual property.
          </div>
        </section>

        {/* 8. Age Restrictions & Child Safety */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              8
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Age Restrictions & Child Safety
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Users must be at least 16 years old to create an account and use Kirnagram. Kirnagram does not
            knowingly collect personal information from children under 16 years of age. Accounts found to violate
            this requirement may be removed immediately.
          </p>
        </section>

        {/* 9. Data Retention */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              9
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Data Retention
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Information is retained only for as long as reasonably necessary to:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Operate platform services",
              "Maintain security",
              "Prevent fraud",
              "Resolve disputes",
              "Comply with legal obligations",
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Certain records may be retained after account deletion where legally required.
          </p>
        </section>

        {/* 10. Account Deletion & User Rights */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              10
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Account Deletion & User Rights
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">Users may request:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Access to their personal information",
              "Correction of inaccurate information",
              "Account deletion",
              "Deletion of eligible personal information",
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2.5">
                <Trash2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Certain information may be retained where required by law, payment regulations, fraud prevention
            requirements, or ongoing investigations.
          </p>
        </section>

        {/* 11. Security Measures */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              11
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Security Measures
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kirnagram uses industry-standard security measures including:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pb-1">
            {[
              "Secure Infrastructure",
              "Access Controls",
              "Encryption Technologies",
              "Security Monitoring Systems",
              "Internal Access Restrictions",
            ].map((measure, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-border/70 bg-muted/20 text-sm text-foreground"
              >
                <Server className="w-4 h-4 text-primary shrink-0" />
                <span>{measure}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            While we strive to protect user information, no online service can guarantee absolute security.
          </p>
        </section>

        {/* 12. Cookies & Similar Technologies */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              12
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Cookies & Similar Technologies
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">Kirnagram may use:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Essential Cookies",
              "Authentication Cookies",
              "Security Cookies",
              "Analytics Technologies",
              "Functional Preferences",
            ].map((cookieType, idx) => (
              <li key={idx} className="flex items-center gap-2.5">
                <Cookie className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{cookieType}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For more information, please review our Cookie Policy.
          </p>
        </section>

        {/* 13. International Data Processing */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              13
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              International Data Processing
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Depending on the services used, information may be processed on servers located in different
            countries through trusted infrastructure providers. Kirnagram takes reasonable measures to ensure data
            protection standards are maintained.
          </p>
        </section>

        {/* 14. Changes to This Privacy Policy */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              14
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Changes to This Privacy Policy
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kirnagram may update this Privacy Policy from time to time. Updated versions will be posted on the
            platform with a revised effective date. Continued use of Kirnagram constitutes acceptance of the
            updated policy.
          </p>
        </section>

        {/* 15. Governing Law & Jurisdiction */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              15
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Governing Law & Jurisdiction
            </h2>
          </div>
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20">
            <Scale className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              This Privacy Policy and any disputes arising under it shall be governed by the laws of India. Any legal
              proceedings shall be subject to the exclusive jurisdiction of the competent courts in Andhra Pradesh,
              India.
            </p>
          </div>
        </section>

        {/* 16. Contact Us */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              16
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Contact Us
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">For privacy-related inquiries:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="mailto:support@kirnagram.com"
              className="p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors space-y-1 block"
            >
              <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                <Mail className="w-3.5 h-3.5" />
                Support Email
              </div>
              <p className="text-sm font-medium text-foreground break-all">support@kirnagram.com</p>
            </a>

            <a
              href="https://www.kirnagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors space-y-1 block"
            >
              <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5" />
                Website
              </div>
              <p className="text-sm font-medium text-foreground">https://www.kirnagram.com</p>
            </a>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1 block">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5" />
                Location
              </div>
              <p className="text-sm font-medium text-foreground">Andhra Pradesh, India</p>
            </div>
          </div>
        </section>

        {/* 17. Acceptance */}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
              17
            </span>
            <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground">
              Acceptance
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing or using Kirnagram, you acknowledge that you have read, understood, and agreed to this
            Privacy Policy.
          </p>
        </section>

        {/* Copyright Footer */}
        <div className="pt-4 pb-8 text-center">
          <p className="text-xs text-muted-foreground font-medium">
            © Kirnagram. All Rights Reserved.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
