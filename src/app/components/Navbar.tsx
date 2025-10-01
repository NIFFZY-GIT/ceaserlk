// src/app/components/Navbar.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, User, CircleUser, X, Settings, Sparkles, ChevronRight } from 'lucide-react';
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
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isMobileMenuOpen]);
  
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
    closeMobileMenu();
    setIsProfileDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsProfileDropdownOpen(false);
    closeMobileMenu();
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
          <button className="p-2 md:hidden" onClick={toggleMobileMenu} aria-label="Toggle menu">
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>
      {/* MOBILE MENU */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div
          className={`absolute inset-0 bg-black/85 backdrop-blur transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeMobileMenu}
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-full max-w-[320px] flex-col border-l border-gray-900 bg-brand-black transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/80">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">Menu</span>
            <button
              onClick={closeMobileMenu}
              aria-label="Close menu"
              className="rounded-full border border-gray-800/70 p-2 text-gray-400 transition-colors hover:border-primary/60 hover:text-primary"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-7">
            <div className="space-y-3">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-base font-semibold uppercase tracking-[0.25em] transition ${
                      isActive
                        ? 'border-primary/60 text-primary'
                        : 'border-transparent text-gray-200 hover:border-primary/40 hover:text-primary'
                    }`}
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 space-y-4 rounded-3xl border border-gray-800/80 bg-gray-900/40 p-5">
              {user ? (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Account</p>
                  <div className="space-y-3">
                    <Link
                      href="/profile"
                      onClick={handleLinkClick}
                      className="flex items-center justify-between rounded-2xl bg-gray-900/60 px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-gray-200 transition hover:text-primary"
                    >
                      <span className="flex items-center gap-3">
                        <User size={18} />
                        Profile
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin/dashboard"
                        onClick={handleLinkClick}
                        className="flex items-center justify-between rounded-2xl bg-gray-900/60 px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-gray-200 transition hover:text-primary"
                      >
                        <span className="flex items-center gap-3">
                          <Settings size={18} />
                          Dashboard
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center justify-between rounded-2xl bg-gray-900/60 px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.25em] text-gray-200 transition hover:text-primary"
                    >
                      <span className="flex items-center gap-3">
                        <X size={18} />
                        Logout
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Account</p>
                  <Link
                    href="/login"
                    onClick={handleLinkClick}
                    className="flex items-center justify-between rounded-2xl bg-gray-900/60 px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-gray-200 transition hover:text-primary"
                  >
                    <span className="flex items-center gap-3">
                      <User size={18} />
                      Sign in
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/signup"
                    onClick={handleLinkClick}
                    className="flex items-center justify-between rounded-2xl border border-primary/40 px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-primary transition hover:border-primary hover:text-primary"
                  >
                    <span>Create account</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-800/80 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 px-6 py-6">
            <div className="space-y-3">
              <Link
                href="/shop"
                onClick={handleLinkClick}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-brand-black shadow-lg transition hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                <span>Continue shopping</span>
              </Link>
              <p className="text-center text-xs text-gray-400">
                Need help?{' '}
                <Link href="/contact" onClick={handleLinkClick} className="font-semibold text-primary hover:text-primary/80">
                  Contact our team
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;