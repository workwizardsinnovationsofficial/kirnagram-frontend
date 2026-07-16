import { MainLayout } from "@/components/layout/MainLayout";

const userTermsSections = [
  {
    title: "1. Platform Usage Responsibility",
    points: [
      "Users are responsible for all activities performed through their accounts.",
      "This includes all images, media, and content shared through the Public Feed, Stories, and any other platform features.",
    ],
  },
  {
    title: "2. AI Creator Attribution",
    points: [
      "Kirnagram operates as a Creative Economy Platform.",
      "When users generate images using templates created by AI Creators, the platform may automatically credit the original creator.",
    ],
  },
  {
    title: "3. Content Moderation & Safety",
    points: [
      "Pornography or sexually explicit material is strictly prohibited.",
      "Illegal or criminal content is strictly prohibited.",
      "Content that violates national or international laws is strictly prohibited.",
      "Kirnagram uses both automated and manual moderation systems to maintain platform safety.",
      "Accounts involved in policy violations may be suspended or permanently banned.",
    ],
  },
  {
    title: "4. Deepfake & Misleading Content",
    points: [
      "Users must not generate AI content that misrepresents or impersonates real individuals in a deceptive or misleading way.",
      "Misleading deepfake content may be removed and accounts may be restricted.",
    ],
  },
  {
    title: "5. Public Figure & Third-Party Protection",
    points: [
      "The unauthorized use of the likeness of celebrities, actors, influencers, or political figures is prohibited.",
      "If users upload an image of another person as a reference image, they confirm that they have obtained permission from that individual.",
      "Kirnagram functions as a neutral AI platform. Users are solely responsible for any misuse of another person's likeness or identity.",
      "Kirnagram is not responsible for legal disputes arising from user-generated content.",
    ],
  },
  {
    title: "6. User Reporting System",
    points: [
      "Users may report harmful, illegal, or policy-violating content through the platform.",
      "Kirnagram may review reports and take appropriate action, including removing content or suspending accounts.",
    ],
  },
  {
    title: "7. Age Requirement",
    points: [
      "Users must be at least 13 years old to use the Kirnagram platform.",
      "Creator monetization features may require users to be 18 years or older.",
    ],
  },
  {
    title: "8. Intellectual Property",
    points: [
      "Users retain ownership of images they generate through the platform, subject to these terms.",
      "AI Creators retain copyright ownership of their prompt structures and template designs.",
    ],
  },
  {
    title: "9. Account Suspension & Termination",
    points: [
      "Kirnagram reserves the right to temporarily suspend or permanently terminate accounts that violate platform policies or engage in harmful, illegal, or abusive activities.",
    ],
  },
  {
    title: "10. Policy Updates",
    points: [
      "Kirnagram reserves the right to update or modify these policies at any time to comply with legal requirements or improve platform safety.",
    ],
  },
];

const creatorTermsSections = [
  {
    title: "1. Engagement Standards and Monetization Framework",
    points: [
      "Kirnagram operates a creator-first ecosystem. Creators earn commissions whenever users generate images using their templates.",
      "Earnings, usage statistics, and payout information are transparently displayed in the Creator Dashboard.",
      "Creators confirm that all submitted prompts, templates, and creative logic are their original intellectual creations.",
      "Submitting copied, plagiarized, or unauthorized content from other platforms is strictly prohibited.",
      "Creators are responsible for ensuring the logical structure, formatting, and accuracy of their prompts.",
      "Kirnagram is not responsible for poor AI outputs caused by formatting errors, typos, or incorrect prompt logic.",
    ],
  },
  {
    title: "2. Template Review & Approval",
    points: [
      "All template submissions undergo a quality and policy review process before being published.",
      "Kirnagram reserves the right to approve submissions, reject templates, or request modifications.",
      "Low-quality, duplicate, or policy-violating templates may be rejected.",
    ],
  },
  {
    title: "3. Creator Violation Policy",
    points: [
      "1st violation: Warning.",
      "2nd violation: Temporary restriction.",
      "3rd violation: Template submission disabled for 30 days.",
      "Severe violations such as illegal or explicit content may result in immediate permanent account suspension.",
    ],
  },
  {
    title: "4. Global AI Safety Compliance",
    points: [
      "All prompts and templates must comply with international AI safety standards.",
      "Prompts designed to generate violent content, pornographic material, or illegal activities are strictly prohibited.",
      "Such violations may result in immediate termination of the creator account.",
    ],
  },
];

const payoutSections = [
  {
    title: "1. Minimum Payout",
    points: [
      "First withdrawal minimum: ₹500.",
      "After the first successful payout, minimum withdrawal: ₹100.",
    ],
  },
  {
    title: "2. Gateway Charges",
    points: [
      "All withdrawals may include payment gateway charges which will be deducted from the payout amount.",
    ],
  },
  {
    title: "3. Taxes",
    points: [
      "Future GST or applicable taxes may be added according to Indian financial regulations and legal compliance requirements.",
    ],
  },
  {
    title: "4. Payment Methods",
    points: [
      "Supported payout methods may include UPI, Bank Transfer, and other supported payment gateways available on the platform.",
    ],
  },
  {
    title: "5. Processing Time",
    points: [
      "Payout requests are usually processed within 3-7 working days after verification.",
    ],
  },
  {
    title: "6. Fraud Prevention",
    points: [
      "Kirnagram reserves the right to review suspicious earnings, bot-generated activity, or artificial usage before approving payouts.",
    ],
  },
];

const creatorRightsSections = [
  {
    title: "1. Copyright & Intellectual Property Policy",
    points: [
      "Creators retain full ownership of their original prompt structure and creative logic.",
      "Kirnagram does not claim ownership over creator prompts or template concepts.",
      "By submitting a template, creators grant Kirnagram a non-exclusive worldwide license to host, distribute, and enable image generation based on their prompt logic.",
      "If any submission infringes trademarks, copyrights, privacy rights, or other intellectual property belonging to a third party, the creator who submitted the content will be solely responsible for the legal consequences.",
      "Kirnagram reserves the right to remove infringing content immediately upon receiving a valid complaint or infringement notice.",
    ],
  },
  {
    title: "2. Prompt Protection Policy",
    points: [
      "Kirnagram protects creator prompt structures and creative logic as confidential intellectual property.",
      "Kirnagram maintains strict confidentiality and will never expose the full prompt structure to users.",
      "Users may generate images using templates, but the underlying prompt logic and structure remain hidden and protected.",
      "Creator prompts may not be copied, extracted through screenshots or data scraping, reverse engineered, or reused on other AI platforms.",
      "Kirnagram uses encrypted storage, restricted system access, and secure generation pipelines to protect creator prompts.",
      "If unauthorized copying or misuse is detected, the responsible account may be suspended, generated content may be removed, and legal action may be taken if necessary.",
    ],
  },
];

const creatorAgreementSummary = [
  "I confirm that my submitted prompts and templates are original works created by me.",
  "I understand that my proprietary prompts will be securely stored and will not be disclosed to third parties.",
  "Kirnagram guarantees that my contact information will not be used for marketing calls or spam communications.",
];

const Terms = () => (
  <MainLayout showRightSidebar={true}>
    <div className="max-w-4xl mx-auto px-3 md:px-0 pb-24 md:pb-8 overflow-x-hidden space-y-8">
      <section className="rounded-3xl border border-border bg-card/70 p-5 md:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-primary mb-3">Kirnagram User Policies & Guidelines</p>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mt-2">Effective Date: February 21, 2026</p>
      </section>

      {userTermsSections.map((section) => (
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
        <h2 className="text-2xl md:text-3xl font-display font-bold">AI Creator Terms & Conditions</h2>
        <p className="text-sm text-muted-foreground mt-2">Last Updated: March 2026</p>
      </section>

      {creatorTermsSections.map((section) => (
        <section key={section.title} className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-3">
          <h3 className="text-lg md:text-xl font-semibold">{section.title}</h3>
          <div className="space-y-2">
            {section.points.map((point) => (
              <p key={point} className="text-sm leading-6 text-muted-foreground">{point}</p>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
        <h3 className="text-lg md:text-xl font-semibold">3. Creator Earnings & Payout Policy</h3>
        {payoutSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h4 className="text-base font-medium">{section.title}</h4>
            {section.points.map((point) => (
              <p key={point} className="text-sm leading-6 text-muted-foreground">{point}</p>
            ))}
          </div>
        ))}
      </section>

      {creatorRightsSections.map((section) => (
        <section key={section.title} className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-3">
          <h3 className="text-lg md:text-xl font-semibold">{section.title}</h3>
          <div className="space-y-2">
            {section.points.map((point) => (
              <p key={point} className="text-sm leading-6 text-muted-foreground">{point}</p>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-3">
        <h3 className="text-lg md:text-xl font-semibold">5. AI Creator Agreement (Summary)</h3>
        <p className="text-sm text-muted-foreground">Displayed during Creator Template Submission.</p>
        <div className="space-y-2">
          {creatorAgreementSummary.map((point) => (
            <p key={point} className="text-sm leading-6 text-muted-foreground">{point}</p>
          ))}
        </div>
      </section>
    </div>
  </MainLayout>
);

export default Terms;