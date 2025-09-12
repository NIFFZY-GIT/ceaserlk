import Sidebar from './_components/Sidebar';
import { ReactNode } from 'react';

// This is the layout that will wrap all pages inside the /admin route
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}