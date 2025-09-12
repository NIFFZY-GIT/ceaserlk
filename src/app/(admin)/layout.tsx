import { ReactNode } from 'react';
import '../globals.css'; // You can keep global styles or create admin-specific ones
import { AuthProvider } from '@/context/AuthContext'; // Auth is still needed

export const metadata = {
  title: 'Ceaser Admin Panel',
  description: 'Manage your store',
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* No CartProvider or CartDrawer here! */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}