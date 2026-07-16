import { MainLayout } from "@/components/layout/MainLayout";

export default function HelpCenter() {
  return (
    <MainLayout>
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Kirnagram</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Kirnagram is your creative social platform to share moments, connect with friends, and discover inspiration.
        </p>
        <p className="text-base text-muted-foreground">
          If you need help or have questions, you’re in the right place!
        </p>
      </div>
    </MainLayout>
  );
}
