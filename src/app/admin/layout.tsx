import AdminLayoutShell from './_components/AdminLayoutShell';
import { ReactNode } from 'react';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// This is the layout that will wrap all pages inside the /admin route
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}