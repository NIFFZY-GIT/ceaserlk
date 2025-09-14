import { ReactNode } from 'react';

// Minimal admin layout - currently using the main admin layout instead
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/* 
TODO: Implement proper admin-specific layout
The commented code below contains the original implementation
that was intended for a separate admin layout structure.

Original implementation (commented out):
*/

// import { ReactNode } from 'react';
// import '../globals.css'; // You can keep global styles or create admin-specific ones
// import { AuthProvider } from '@/context/AuthContext'; // Auth is still needed

// export const metadata = {
//   title: 'Ceaser Admin Panel',
//   description: 'Manage your store',
// };

// export default function AdminRootLayout({ children }: { children: ReactNode }) {
//   return (
//     <html lang="en">
//       <body>
//         <AuthProvider>
//           {/* No CartProvider or CartDrawer here! */}
//           {children}
//         </AuthProvider>
//       </body>
//     </html>
//   );
// }