// src/app/components/Navbar.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, User, CircleUser, X, Settings } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

// UPDATED: 'Collections' is now a direct link, and the subMenu is removed.
const navLinks = [
   { href: '/', label: 'Home' },
   { href: '/shop', label: 'Shop' },
   { href: '/about', label: 'Our Mission' },
   { href: '/contact', label: 'Contact Us' },
];

const Navbar = () => {
  const { openCart, cartCount } = useCart();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isMobileMenuOpen]);
  
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [pathname, isMobileMenuOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsProfileDropdownOpen(false);
  };
  return (
    <header className="sticky top-0 z-30 shadow-lg bg-brand-black text-brand-white">
      <nav className="container flex items-center justify-between px-6 py-6 mx-auto">
        {/* LOGO */}
        <Link href="/" onClick={handleLinkClick} className="transition-opacity rounded-sm hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Image
            src="/images/logo1.png"
            alt="Ceaser Brand Logo"
            width={150}
            height={63}
            priority
          />
        </Link>
        {/* DESKTOP NAVIGATION (Simplified) */}
        <div className="items-center hidden space-x-10 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`relative uppercase font-bold text-sm tracking-wider transition-colors ${isActive ? 'text-primary' : 'hover:text-primary'}`}
              >
                {link.label}
                {isActive && <span className="absolute -bottom-6 left-0 w-full h-[3px] bg-accent rounded-full"></span>}
              </Link>
            );
          })}
        </div>
        {/* RIGHT SIDE ICONS & MOBILE MENU TOGGLE */}
        <div className="flex items-center space-x-5">
          {/* Profile Icon with Conditional Logic */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="hidden transition-colors hover:text-primary md:block"
              >
                <CircleUser size={26} />
              </button>
              
              {/* Profile Dropdown */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 z-50 w-48 py-2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg top-full">
                  <Link
                    href="/profile"
                    onClick={handleLinkClick}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link
                      href="/admin/dashboard"
                      onClick={handleLinkClick}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden transition-colors hover:text-primary md:block">
              <CircleUser size={26} />
            </Link>
          )}
          
          <button onClick={openCart} className="relative transition-colors hover:text-primary">
            <ShoppingCart size={26} />
            {cartCount > 0 && (<span className="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full -top-2 -right-2 bg-accent">{cartCount}</span>)}
          </button>
          <button className="p-2 md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>
      {/* MOBILE MENU (Simplified) */}
      <div className={`absolute top-full left-0 w-full bg-brand-black shadow-lg md:hidden transition-all duration-300 ease-in-out z-20 ${isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="flex flex-col items-center py-10 space-y-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={handleLinkClick} 
              className={`text-lg uppercase font-bold tracking-wider hover:text-primary ${pathname === link.href ? 'text-primary' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="w-3/4 pt-6 mt-4 border-t border-gray-700">
            {user ? (
              <div className="space-y-4">
                <Link 
                  href="/profile" 
                  onClick={handleLinkClick} 
                  className="flex items-center justify-center gap-3 text-lg font-bold tracking-wider uppercase hover:text-primary"
                >
                  <User size={26} /> <span>Profile</span>
                </Link>
                {user.role === 'ADMIN' && (
                  <Link 
                    href="/admin/dashboard" 
                    onClick={handleLinkClick} 
                    className="flex items-center justify-center gap-3 text-lg font-bold tracking-wider uppercase hover:text-primary"
                  >
                    <Settings size={26} /> <span>Dashboard</span>
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center w-full gap-3 text-lg font-bold tracking-wider uppercase hover:text-primary"
                >
                  <X size={26} /> <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={handleLinkClick} className="flex items-center justify-center gap-3 text-lg font-bold tracking-wider uppercase hover:text-primary">
                <User size={26} /> <span>Account</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;