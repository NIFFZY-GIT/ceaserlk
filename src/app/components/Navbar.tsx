// src/app/components/Navbar.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, User, CircleUser, X, Settings, Sparkles, ChevronRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

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

  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
  
  const handleOpenCart = () => {
    closeMobileMenu();
    openCart();
  };

  const hasItems = cartCount > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(0,0,0,0.9)] text-brand-white shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-[rgba(0,0,0,0.85)]">
      <nav className="container mx-auto flex w-full max-w-6xl items-center justify-between px-3 py-3 sm:px-5 md:px-6 md:py-5">
        <Link href="/" onClick={handleLinkClick} className="flex items-center gap-2 rounded-md transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:opacity-90">
          <Image src="/images/logo1.png" alt="Ceaser Brand Logo" width={150} height={63} priority className="h-9 w-auto sm:h-10 md:h-12" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6 lg:space-x-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.label} href={link.href} className={`group relative flex flex-col items-center gap-1 uppercase text-[13px] tracking-[0.25em] transition-all duration-200 ${isActive ? 'text-white font-semibold' : 'text-white/50 font-medium hover:text-white hover:font-semibold'}`}>
                <span>{link.label}</span>
                <span className={`absolute -bottom-5 left-1/2 flex h-[3px] w-14 -translate-x-1/2 transform overflow-hidden rounded-full transition-all duration-200 ${isActive ? 'scale-100 opacity-100' : 'scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100'}`}>
                  <span className="flex-1 bg-[#009246]"></span>
                  <span className="flex-1 bg-white"></span>
                  <span className="flex-1 bg-[#ce2b37]"></span>
                </span>
              </Link>
            );
          })}
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Desktop Profile Icon */}
          <div className="hidden md:block">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="rounded-full p-2 transition-colors hover:bg-white/10 hover:text-white">
                  <CircleUser size={26} />
                </button>
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link href="/profile" onClick={handleLinkClick} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <User className="w-4 h-4 mr-2" /> Profile
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link href="/admin/dashboard" onClick={handleLinkClick} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <Settings className="w-4 h-4 mr-2" /> Dashboard
                      </Link>
                    )}
                    <button onClick={handleLogout} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <X className="w-4 h-4 mr-2" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="rounded-full p-2 transition-colors hover:bg-white/10 hover:text-white">
                <CircleUser size={26} />
              </Link>
            )}
          </div>
          
          <button onClick={openCart} className="relative hidden p-2 transition-colors rounded-full md:block hover:bg-white/10 hover:text-white" aria-label="Open shopping cart">
              <ShoppingCart size={26} />
              {hasItems && (
                <span className="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full -top-2 -right-2 bg-accent">{cartCount}</span>
              )}
          </button>

          {/* Mobile Menu Toggle */}
          <button className="p-2 transition-colors rounded-full hover:bg-white/10 md:hidden" onClick={toggleMobileMenu} aria-label="Toggle menu">
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`absolute top-full left-0 w-full bg-[rgba(10,10,12,0.96)] md:hidden transition-all duration-300 ease-in-out overflow-hidden ${isMobileMenuOpen ? 'max-h-screen' : 'max-h-0'}`}>
        <div className="flex flex-col px-5 py-8 space-y-4">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} onClick={handleLinkClick} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-base font-semibold uppercase tracking-[0.08em] transition ${pathname === link.href ? 'border-primary/60 bg-primary/10 text-white' : 'border-white/10 text-gray-200 hover:border-primary/40 hover:bg-primary/5 hover:text-white'}`}>
              <span>{link.label}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t border-white/10">
            {user ? (
              <div className="space-y-3">
                 <p className="px-4 text-xs font-semibold uppercase tracking-[0.15em] text-gray-200">Signed in as {user.firstName ?? user.email}</p>
                <Link href="/profile" onClick={handleLinkClick} className="flex items-center justify-between rounded-2xl bg-black/40 px-4 py-3 transition hover:bg-primary/15 hover:text-white">
                  <span className="flex items-center gap-3"><User size={18} /> Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                {user.role === 'ADMIN' && (
                  <Link href="/admin/dashboard" onClick={handleLinkClick} className="flex items-center justify-between rounded-2xl bg-black/40 px-4 py-3 transition hover:bg-primary/15 hover:text-white">
                    <span className="flex items-center gap-3"><Settings size={18} /> Dashboard</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
                 <button onClick={handleOpenCart} className="flex w-full items-center justify-between rounded-2xl bg-black/40 px-4 py-3 text-left transition hover:bg-primary/15 hover:text-white">
                    <span className="relative flex items-center gap-3">
                        <ShoppingCart size={18} /> Cart
                        {hasItems && (
                            <span className="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full -top-2 -right-6 bg-accent">{cartCount}</span>
                        )}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={handleLogout} className="flex w-full items-center justify-between rounded-2xl bg-black/40 px-4 py-3 text-left transition hover:bg-red-500/20 hover:text-white">
                  <span className="flex items-center gap-3"><X size={18} /> Logout</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Link href="/login" onClick={handleLinkClick} className="flex items-center justify-between rounded-2xl bg-black/40 px-4 py-3 transition hover:bg-primary/15 hover:text-white">
                  <span className="flex items-center gap-3"><User size={18} /> Sign in</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link href="/signup" onClick={handleLinkClick} className="flex items-center justify-between rounded-2xl border border-primary/50 px-4 py-3 text-primary transition hover:border-primary hover:bg-primary/10 hover:text-white">
                  <span>Create account</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;