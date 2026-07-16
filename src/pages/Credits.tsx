import { MainLayout } from "@/components/layout/MainLayout";
import { CreditsWalletPanel } from "@/components/CreditsWallet";

const Credits = () => {
  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto pb-20 md:pb-0">
        <CreditsWalletPanel />
      </div>
    </MainLayout>
  );
};

export default Credits;
