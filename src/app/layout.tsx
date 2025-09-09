// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { CartProvider } from '@/context/CartContext';
import { CartDrawer } from '@/app/components/CartDrawer';
import MarqueeBar from '@/app/components/MarqueeBar'; // <-- 1. IMPORT THE NEW COMPONENT
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ceaser - Motivational Shirts',
  description: 'Premium quality shirts designed to inspire you.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50`}>
        <CartProvider>
          <MarqueeBar /> {/* <-- 2. ADD IT HERE */}
          <Navbar />
          <CartDrawer />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}