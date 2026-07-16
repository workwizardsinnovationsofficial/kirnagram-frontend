import { X } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal = ({ isOpen, onClose }: TermsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-lg border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background rounded-t-xl">
          <h2 className="text-2xl font-bold text-foreground">Terms of Service</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 text-sm text-muted-foreground space-y-5">
          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-1">Kirnagram User Policies & Guidelines</p>
            <h3 className="text-lg font-semibold text-foreground mb-1">Terms & Conditions</h3>
            <p>Effective Date: February 21, 2026</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">1. Platform Usage Responsibility</h4>
            <p>Users are responsible for all activities performed through their accounts, including content shared in Public Feed, Stories, and other platform features.</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">2. AI Creator Attribution</h4>
            <p>When users generate images using creator templates, Kirnagram may automatically credit the original AI Creator.</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">3. Content Moderation & Safety</h4>
            <p>Pornographic, illegal, and law-violating content is strictly prohibited. Kirnagram uses automated and manual moderation. Violations may result in suspension or permanent ban.</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">4. Deepfake & Public Figure Rules</h4>
            <p>Deceptive impersonation, misleading deepfakes, and unauthorized use of celebrity or political figure likeness are prohibited.</p>
            <p className="mt-1">If users upload another person's image, they confirm consent from that individual.</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">5. Reporting, Age & IP</h4>
            <p>Users can report harmful or policy-violating content. Minimum platform age is 13; creator monetization may require 18+.</p>
            <p className="mt-1">Users retain ownership of generated images. AI Creators retain ownership of prompt structures and template designs.</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">6. Suspension, Termination & Policy Updates</h4>
            <p>Kirnagram may suspend or terminate accounts for harmful, illegal, or abusive behavior and may update policies to meet legal and safety requirements.</p>
          </section>

          <section className="pt-2 border-t border-border">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-1">Kirnagram AI Creator Policies & Guidelines</p>
            <h3 className="text-lg font-semibold text-foreground mb-2">AI Creator Terms & Conditions</h3>
            <p>Creators earn commission when users generate using their templates. Earnings and usage are shown in Creator Dashboard.</p>
            <p className="mt-1">Minimum payout: first withdrawal INR 500, then INR 100 after first successful payout.</p>
            <p className="mt-1">Withdrawals may include gateway charges and applicable taxes. Processing time is usually 3-7 business days.</p>
            <p className="mt-1">Copied, plagiarized, violent, pornographic, or illegal prompt templates are prohibited and may lead to immediate account action.</p>
            <p className="mt-1">Creators retain ownership of original prompt logic. By submission, creators grant Kirnagram a non-exclusive license to host and enable generation from templates.</p>
            <p className="mt-1">Kirnagram protects prompt confidentiality. Unauthorized copying, scraping, reverse engineering, or reuse on other platforms is prohibited.</p>
            <p className="mt-2">Last updated: March 2026</p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 bg-background sticky bottom-0 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
