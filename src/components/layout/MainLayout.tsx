import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  showNav?: boolean;
}

export function MainLayout({ children, title, showNav = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {title && (
        <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">🏐</span>
            </div>
            <h1 className="text-xl font-bold">{title}</h1>
          </div>
        </header>
      )}
      
      <main className={`container py-4 ${showNav ? 'pb-20' : ''}`}>
        {children}
      </main>
      
      {showNav && <BottomNav />}
    </div>
  );
}
