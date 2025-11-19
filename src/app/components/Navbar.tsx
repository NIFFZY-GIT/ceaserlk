// src/app/components/Navbar.tsx

"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, User, CircleUser, X, Settings, Sparkles, ChevronRight, LogOut } from 'lucide-react';
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

  const handleCartClick = () => {
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
              <div 
                className="relative" 
                ref={dropdownRef}
                onMouseEnter={() => setIsProfileDropdownOpen(true)}
                onMouseLeave={() => setIsProfileDropdownOpen(false)}
              >
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} 
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 border ${
                    isProfileDropdownOpen 
                      ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105' 
                      : 'bg-white/10 text-white border-transparent hover:bg-white hover:text-black hover:border-white'
                  }`}
                >
                  <span className="text-sm font-bold">
                    {user.firstName ? user.firstName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </span>
                </button>
                
                {/* Dropdown Menu */}
                <div 
                  className={`absolute right-0 top-full pt-4 w-72 z-50 transition-all duration-300 origin-top-right ${
                    isProfileDropdownOpen 
                      ? 'opacity-100 translate-y-0 scale-100' 
                      : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 ring-1 ring-black/5">
                    {/* User Header */}
                    <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Signed in as</p>
                      <p className="text-base font-bold text-gray-900 truncate">{user.firstName || 'User'}</p>
                      <p className="text-xs font-medium text-gray-500 truncate">{user.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 space-y-1">
                      <Link 
                        href="/profile" 
                        onClick={handleLinkClick} 
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100 transition-all group"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-black group-hover:shadow-md transition-all duration-300">
                          <User size={16} />
                        </div>
                        <span className="group-hover:translate-x-1 transition-transform duration-300">My Profile</span>
                      </Link>
                      
                      {user.role === 'ADMIN' && (
                        <Link 
                          href="/admin/dashboard" 
                          onClick={handleLinkClick} 
                          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100 transition-all group"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-black group-hover:shadow-md transition-all duration-300">
                            <Settings size={16} />
                          </div>
                          <span className="group-hover:translate-x-1 transition-transform duration-300">Admin Dashboard</span>
                        </Link>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                      <button 
                        onClick={handleLogout} 
                        className="flex items-center w-full gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all group"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100/50 text-red-500 group-hover:bg-red-100 group-hover:shadow-sm transition-all duration-300">
                          <LogOut size={16} />
                        </div>
                        <span className="group-hover:translate-x-1 transition-transform duration-300">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-white border border-white/10 transition-all duration-300 hover:bg-white hover:text-black hover:border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] group"
                aria-label="Sign in"
              >
                <User size={20} className="transition-transform duration-300 group-hover:scale-110" />
              </Link>
            )}
          </div>
          
          <button onClick={handleCartClick} className="relative hidden p-2 transition-colors rounded-full md:block hover:bg-white/10 hover:text-white" aria-label="Open shopping cart">
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