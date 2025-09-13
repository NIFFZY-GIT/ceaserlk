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