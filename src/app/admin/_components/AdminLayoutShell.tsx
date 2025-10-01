"use client";

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

type AdminLayoutShellProps = {
  children: ReactNode;
};

const AdminLayoutShell = ({ children }: AdminLayoutShellProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  useEffect(() => {
    if (!isSidebarOpen) {
      document.body.classList.remove('overflow-hidden');
      return;
    }

    document.body.classList.add('overflow-hidden');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('overflow-hidden');
    };
  }, [isSidebarOpen, closeSidebar]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:shrink-0">
        <Sidebar className="shadow-lg" />
      </div>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
          <button
            type="button"
            onClick={openSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Open admin navigation</span>
          </button>

          <div className="flex flex-col text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Admin
            </span>
            <span className="text-base font-semibold text-slate-900">
              Ceaser Control Center
            </span>
          </div>

          <Link
            href="/"
            className="text-sm font-semibold text-primary transition hover:text-primary/80"
          >
            View site
          </Link>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>

      {isSidebarOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={closeSidebar}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw]">
            <div className="relative h-full">
              <Sidebar className="h-full w-full bg-gray-900 shadow-2xl" onNavigate={closeSidebar} />

              <button
                type="button"
                onClick={closeSidebar}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Close navigation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayoutShell;
