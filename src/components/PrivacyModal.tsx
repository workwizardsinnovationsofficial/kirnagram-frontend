import { X } from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal = ({ isOpen, onClose }: PrivacyModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-lg border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background rounded-t-xl">
          <h2 className="text-2xl font-bold text-foreground">Privacy Policy</h2>
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
            <h3 className="text-lg font-semibold text-foreground mb-1">Privacy Policy</h3>
            <p>Last Updated: February 21, 2026</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">1. Data Collection & Zero-Training Guarantee</h4>
            <p>Kirnagram collects only basic account details required for operation, including name and email.</p>
            <p className="mt-1">Kirnagram does not use uploaded references or generated outputs to train, retrain, or improve AI models.</p>
            <p className="mt-1">Reference images are processed temporarily in secure memory and are not stored for AI training, analytics, or data mining.</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">2. Third-Party AI Services</h4>
            <p>Kirnagram may use third-party AI providers such as Gemini, OpenAI, or other supported generation services.</p>
            <p className="mt-1">Kirnagram does not use user data for AI training, but third-party providers may process generation data under their own policies.</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">3. Stories, Feed & Watermarking</h4>
            <p>Stories media is temporary and deleted after 24 hours. Public feed media is stored securely for platform functionality.</p>
            <p className="mt-1">AI-generated images include mandatory watermarking. Removing, hiding, or modifying the watermark is prohibited.</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">4. Infrastructure Security</h4>
            <p>Kirnagram uses secure VPS infrastructure, encrypted transmission, encrypted storage, and restricted internal access to protect user data.</p>
          </section>

          <section className="pt-2 border-t border-border">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-1">Kirnagram AI Creator Policies & Guidelines</p>
            <h3 className="text-lg font-semibold text-foreground mb-2">AI Creator Privacy Policy</h3>
            <p>Creator prompts and creative logic are treated as confidential and will not be sold, leaked, or disclosed to third parties.</p>
            <p className="mt-1">Creator data is hosted on secure infrastructure with end-to-end encryption and modern privacy protections.</p>
            <p className="mt-1">Contact information is used only for verification, security updates, and official communication under a strict zero-spam policy.</p>
            <p className="mt-1">Creators retain autonomy over their data and may request deletion of templates, prompts, or account data.</p>
            <p className="mt-2">Last updated: March 2026</p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">Security Notice</h4>
            <p>If unauthorized access, hacking attempts, or data theft occurs, Kirnagram may take immediate protective and legal action where necessary.</p>
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
