import { ReactNode } from 'react';
import { Navbar } from './Navbar';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="bg-white border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} STEMPath Finder. Empowering students to build their future.
          </p>
          <div className="mt-4 flex justify-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="/admin/login" className="hover:text-primary transition-colors">Admin Access</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
