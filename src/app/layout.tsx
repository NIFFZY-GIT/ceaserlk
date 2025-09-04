// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { CartProvider } from '@/context/CartContext'; // <-- Import Provider
import { CartDrawer } from '@/app/components/CartDrawer'; // <-- Import Drawer

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
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <CartProvider> {/* <-- Wrap everything in the provider */}
          <Navbar />
          <CartDrawer /> {/* <-- Add the drawer here */}
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}