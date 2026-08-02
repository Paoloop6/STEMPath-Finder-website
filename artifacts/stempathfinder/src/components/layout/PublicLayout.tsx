import type { ReactNode } from 'react';
import { InteractiveField } from '@/components/home/InteractiveField';
import { HomeFooter } from '@/components/home/HomeSections';
import { TopBar } from './TopBar';

/** Shared shell for every public page: flow-field background, liquid-glass top
 * bar, and footer. Auth-gated content can be layered in later without touching
 * page components. */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <InteractiveField />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopBar />
        <main className="flex-1">{children}</main>
        <HomeFooter />
      </div>
    </div>
  );
}
