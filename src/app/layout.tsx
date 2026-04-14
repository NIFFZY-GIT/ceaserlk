// src/app/layout.tsx

import type { Metadata } from 'next';
import Script from 'next/script';
import { Montserrat } from 'next/font/google';
import './globals.css';

import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CartDrawer } from '@/app/components/CartDrawer';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { SessionExpiryMonitor } from '@/components/SessionExpiryMonitor';
import { SessionExpiredModal } from '@/components/SessionExpiredModal';

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

export const metadata: Metadata = {
  title: 'CEASAR - Official Website',
  description: 'Premium quality shirts designed to inspire you.',
  verification: {
    google: '5Scd202sjAm8HUkdAqXIQsbcmJmlc86jQHyhhveExms',
    other: {
      'facebook-domain-verification': '65ktjsbn2d9csdxety54i6t42bd6zq',
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={montserrat.variable}>
      <body className={`bg-brand-black ${montserrat.className}`}>
        
        {/* --- Google Tag Manager Container 2 (GTM-N7WP5L48) --- */}
        <Script
          id="gtm-manager-2"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-N7WP5L48');`,
          }}
        />

        {/* --- Google Ads tag (AW-18044472287) --- */}
        <Script
          id="google-ads-gtag-src"
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=AW-18044472287"
        />
        <Script
          id="google-ads-gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-18044472287');
            `,
          }}
        />

        {/* --- Meta Pixel Code (1431696128992860) --- */}
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1431696128992860');
              fbq('track', 'PageView');
            `,
          }}
        />

        {/* --- Noscript fallbacks for GTM and Meta Pixel --- */} 
        <noscript>
          {/* GTM Container 2 */}
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-N7WP5L48"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
          {/* Meta Pixel */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            height="1" 
            width="1" 
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1431696128992860&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        {/* Skip ngrok browser warning for client-side fetch calls */}
        <Script
          id="ngrok-fetch-patch"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `if(location.hostname.includes('ngrok')){var _f=window.fetch;window.fetch=function(u,o){o=o||{};o.headers=new Headers(o.headers||{});o.headers.set('ngrok-skip-browser-warning','true');return _f.call(this,u,o);}}`
          }}
        />

        <AuthProvider>
          <CartProvider>
            <SessionExpiryMonitor />
            <SessionExpiredModal />
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