import { ReactNode } from 'react';

// Minimal storefront layout - currently using the main layout instead
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/* 
TODO: Implement proper storefront-specific layout
The commented code below contains the original implementation
that was intended for a separate storefront layout structure.

Original implementation (commented out):
*/

// import { ReactNode } from 'react';
// import Navbar from '../components/Navbar';
// import Footer from '../components/Footer';
// import { CartDrawer } from '../components/CartDrawer';
// import { AuthProvider } from '@/context/AuthContext';
// import { CartProvider } from '@/context/CartContext';
// import '../globals.css';

// // ... your metadata object ...

// export default function StorefrontRootLayout({ children }: { children: ReactNode }) {
//   return (
//     <html lang="en">
//       <body>
//         <AuthProvider>
//           <CartProvider>
//             <Navbar />
//             <CartDrawer />
//             <main>{children}</main>
//             <Footer />
//           </CartProvider>
//         </AuthProvider>
//       </body>
//     </html>
//   );
// }