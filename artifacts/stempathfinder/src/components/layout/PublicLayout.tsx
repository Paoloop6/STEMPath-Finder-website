import type { ReactNode } from 'react';
import { HomeFooter } from '@/components/home/HomeSections';
import { TopBar } from './TopBar';
import { MyBoardDrawer } from '@/components/home/MyBoardDrawer';

/** Shared shell for every public page: the hall. A bright ground, the signage
 * bar, the page, and the index at the end. */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <TopBar />
      <main className="flex-1">{children}</main>
      <HomeFooter />
      <MyBoardDrawer />
    </div>
  );
}
