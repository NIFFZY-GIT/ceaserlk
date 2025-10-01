"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LayoutDashboard, ShoppingBag, Users, PackagePlus, Shield } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/admin/products', icon: ShoppingBag },
  { name: 'Orders', href: '/admin/orders', icon: PackagePlus },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Admins', href: '/admin/admins', icon: Shield },
];

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

const Sidebar = ({ className, onNavigate }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        'flex h-full min-h-screen flex-col flex-shrink-0 w-64 text-white bg-gray-800',
        className,
      )}
    >
      <div className="flex items-center justify-center h-16 text-2xl font-bold border-b border-gray-700">
        CEASER
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => {
                if (onNavigate) {
                  onNavigate();
                }
              }}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      {/* Optional: Add user profile/logout section at the bottom */}
    </aside>
  );
};

export default Sidebar;