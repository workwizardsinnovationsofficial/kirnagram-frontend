import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { RightSidebar } from "./RightSidebar";
import { BottomNav } from "./BottomNav";


interface MainLayoutProps {
  children: React.ReactNode;
  showRightSidebar?: boolean;
  fromProfile?: boolean;
}

export function MainLayout({ children, showRightSidebar = true, fromProfile }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Subtle pattern overlay */}
      <div className="fixed inset-0 opacity-5 pointer-events-none bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />

      {/* Header: show only on mobile, sticky at top */}
      <div className="block lg:hidden w-full">
        <Header />
      </div>

      <div className="flex w-full overflow-x-hidden">
        {/* Sidebar: fixed width 260px, only on desktop */}
        <div className="hidden lg:flex w-[260px] flex-shrink-0">
          <Sidebar fromProfile={fromProfile} />
        </div>
        {/* Feed center: fixed width 600px */}
        <div className="flex-1 flex flex-col min-h-screen items-center overflow-x-hidden">
          {/* Add top margin on mobile to prevent overlap with header */}
          <div className="flex-1 flex justify-center gap-6 p-4 lg:p-6 pb-20 lg:pb-6 w-full overflow-x-hidden mt-[64px] lg:mt-0">
            <main className="w-full max-w-[900px] min-w-0 animate-fade-in overflow-x-hidden">
              {children}
            </main>
            {/* Right Panel: fixed width 320px */}
            {showRightSidebar && (
              <div className="hidden xl:block w-[320px] shrink-0">
                <div className="fixed bottom-8 right-8 w-[320px]">
                  <RightSidebar />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav fromProfile={fromProfile} />
    </div>
  );
}
