import { MainLayout } from "@/components/layout/MainLayout";

const userPrivacySections = [
  {
    title: "1. Data Collection & Zero-Training Guarantee",
    points: [
      "Kirnagram collects only the basic account information needed to operate the platform, including your name and email address.",
      "This information is used to manage user accounts, authentication, and core platform services.",
      "Kirnagram does not use your uploaded reference images or AI-generated outputs to train, retrain, or improve AI models.",
      "Your creative inputs remain your own property.",
      "Reference images uploaded for AI generation are processed temporarily in secure system memory and are not permanently stored for AI training, analytics, or data mining purposes.",
    ],
  },
  {
    title: "2. Third-Party AI Services",
    points: [
      "Kirnagram may use third-party AI models or APIs such as Gemini, OpenAI, or other supported AI generation providers.",
      "Kirnagram does not use user data for training AI systems.",
      "During AI generation processes, third-party services may process data according to their own privacy policies and terms.",
      "Where required, users should review the applicable policies of those providers directly.",
    ],
  },
  {
    title: "3. Social Metadata & Platform Features",
    points: [
      "Media uploaded to Stories is stored temporarily and automatically deleted after 24 hours.",
      "Content posted to the Public Feed is securely stored in cloud storage and indexed in the platform database to support feed functionality.",
    ],
  },
  {
    title: "4. AI Identification & Watermarking",
    points: [
      "All images generated through Kirnagram include an AI watermark to clearly identify the content as AI-generated.",
      "Users are not permitted to remove, hide, or modify the AI watermark.",
      "Violations may result in content removal or account restrictions.",
    ],
  },
  {
    title: "5. Infrastructure Security",
    points: [
      "Kirnagram operates on secure VPS infrastructure and applies modern security standards to protect user data.",
      "Security measures include end-to-end encryption for data transmission, secure encrypted storage, and restricted internal system access.",
      "These controls are intended to reduce the risk of unauthorized access to user information and creative assets.",
    ],
  },
  {
    title: "6. Security Notice",
    points: [
      "Kirnagram is committed to protecting user data and creative assets.",
      "If unauthorized access, hacking attempts, or data theft occurs, Kirnagram may take immediate action and pursue legal measures where necessary.",
    ],
  },
];

const creatorPrivacySections = [
  {
    title: "1. Commitment to Confidentiality and Data Protection",
    points: [
      "Your unique AI prompts and creative logic are treated as strictly confidential.",
      "Kirnagram guarantees that your proprietary prompt structures will never be sold, leaked, or disclosed to any third-party entities.",
      "All creator data and submissions are hosted on secure private VPS infrastructure with end-to-end encryption.",
      "The platform follows modern security protocols and global privacy protection standards.",
    ],
  },
  {
    title: "2. Zero-Spam Policy",
    points: [
      "Your contact information is used strictly for account verification, security notifications, and official platform updates.",
      "Kirnagram maintains a strict zero-tolerance policy against marketing spam, promotional calls, or unauthorized communication.",
    ],
  },
  {
    title: "3. Data Sovereignty",
    points: [
      "Creators retain full autonomy over their data.",
      "You may request the permanent deletion of your templates, prompts, or account information at any time.",
    ],
  },
];

const Privacy = () => (
  <MainLayout showRightSidebar={true}>
    <div className="max-w-4xl mx-auto px-3 md:px-0 pb-24 md:pb-8 overflow-x-hidden space-y-8">
      <section className="rounded-3xl border border-border bg-card/70 p-5 md:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-primary mb-3">Kirnagram User Policies & Guidelines</p>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">Last Updated: February 21, 2026</p>
        <p className="text-sm text-muted-foreground mt-4 leading-6">
          Kirnagram is an AI Creative Social Platform. We prioritize the protection of your personal data and the security of your creative assets. This policy explains how your information is collected, processed, and protected while using the platform.
        </p>
      </section>

      {userPrivacySections.map((section) => (
        <section key={section.title} className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-3">
          <h2 className="text-lg md:text-xl font-semibold">{section.title}</h2>
          <div className="space-y-2">
            {section.points.map((point) => (
              <p key={point} className="text-sm leading-6 text-muted-foreground">{point}</p>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-3xl border border-border bg-card/70 p-5 md:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-primary mb-3">Kirnagram AI Creator Policies & Guidelines</p>
        <h2 className="text-2xl md:text-3xl font-display font-bold">AI Creator Privacy Policy</h2>
        <p className="text-sm text-muted-foreground mt-2">Last Updated: March 2026</p>
      </section>

      {creatorPrivacySections.map((section) => (
        <section key={section.title} className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-3">
          <h3 className="text-lg md:text-xl font-semibold">{section.title}</h3>
          <div className="space-y-2">
            {section.points.map((point) => (
              <p key={point} className="text-sm leading-6 text-muted-foreground">{point}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  </MainLayout>
);

export default Privacy;