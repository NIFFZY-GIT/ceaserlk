// src/app/layout.tsx

import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';

import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CartDrawer } from '@/app/components/CartDrawer';
import MarqueeBar from '@/app/components/MarqueeBar'; // <-- 1. IMPORT THE NEW COMPONENT
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

// Optimize font loading with Next.js font system
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

export const metadata: Metadata = {
  title: 'CeaserLK - Motivation For Your Style',
  description: 'Premium quality shirts designed to inspire you.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={montserrat.variable}>
      <body className={`bg-brand-black ${montserrat.className}`}>
        <AuthProvider>
          <CartProvider>
            {/* <MarqueeBar /> */}
            <Navbar />
            <CartDrawer />
            <main>{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}