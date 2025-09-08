// src/app/components/Navbar.tsx

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, User, CircleUser, X, ChevronDown } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const navLinks = [
  { href: '/shop', label: 'Shop' },
  {
    label: 'Collections',
    subMenu: [
      { href: '/collections/new-arrivals', label: 'New Arrivals' },
      { href: '/collections/best-sellers', label: 'Best Sellers' },
      { href: '/collections/on-sale', label: 'On Sale' },
    ]
  },
  { href: '/about', label: 'Our Mission' },
  { href: '/contact', label: 'Contact Us' },
];

const Navbar = () => {
  const { openCart, cartCount } = useCart();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isMobileMenuOpen]);
  
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [pathname]);

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    // MAIN THEME: Black background ('bg-brand-black') and White text ('text-brand-white')
    <header className="sticky top-0 z-30 shadow-lg bg-brand-black text-brand-white">
      {/* 
        ====================================================================
          CHANGE HERE: Increased vertical padding from py-4 to py-6
        ====================================================================
      */}
      <nav className="container flex items-center justify-between px-6 py-6 mx-auto">
        {/* LOGO */}
        <Link href="/" onClick={handleLinkClick} className="transition-opacity rounded-sm hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Image
            src="/assets/logo1.png"
            alt="Ceaser Brand Logo"
            width={150}
            height={63}
            priority
          />
        </Link>

        {/* DESKTOP NAVIGATION */}
        <div className="items-center hidden space-x-10 md:flex">
          {navLinks.map((link) => {
            const isSubMenuActive = link.subMenu?.some(sub => pathname === sub.href);
            const isActive = pathname === link.href || isSubMenuActive;
            const isDropdownOpen = openDropdown === link.label;

            return (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.subMenu && setOpenDropdown(link.label)}
                onMouseLeave={() => link.subMenu && setOpenDropdown(null)}
              >
                {link.subMenu ? (
                  <button
                    aria-haspopup="true"
                    aria-expanded={isDropdownOpen}
                    // ACTIVE/HOVER: Uses Green ('text-primary')
                    className={`relative flex items-center gap-1 uppercase font-bold text-sm tracking-wider transition-colors ${isActive ? 'text-primary' : 'hover:text-primary'}`}
                  >
                    {link.label}
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    {/* ACTIVE UNDERLINE: Uses Red ('bg-accent') */}
                    {isActive && <span className="absolute -bottom-6 left-0 w-full h-[3px] bg-accent rounded-full"></span>}
                  </button>
                ) : (
                  <Link href={link.href!} className={`relative uppercase font-bold text-sm tracking-wider transition-colors ${isActive ? 'text-primary' : 'hover:text-primary'}`}>
                    {link.label}
                    {/* ACTIVE UNDERLINE: Uses Red ('bg-accent') */}
                    {isActive && <span className="absolute -bottom-6 left-0 w-full h-[3px] bg-accent rounded-full"></span>}
                  </Link>
                )}
                {/* DESKTOP DROPDOWN: Black background ('bg-brand-black') */}
                {link.subMenu && (
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 w-52 bg-brand-black border border-gray-700 shadow-lg rounded-md py-2 z-40 transition-opacity duration-200 ${isDropdownOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {link.subMenu.map((subLink) => (
                      <Link
                        key={subLink.label}
                        href={subLink.href}
                        // DROPDOWN LINKS: White text, active is Red ('text-accent'), hover is Green ('hover:bg-primary')
                        className={`block px-5 py-3 text-sm font-medium transition-colors ${pathname === subLink.href ? 'text-accent' : 'text-brand-white hover:bg-primary hover:text-white'}`}
                      >
                        {subLink.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* RIGHT SIDE ICONS & MOBILE MENU TOGGLE */}
        <div className="flex items-center space-x-5">
          {/* ICONS HOVER: Uses Green ('hover:text-primary') */}
          <Link href="/login" className="hidden transition-colors hover:text-primary md:block"> <CircleUser size={26} /> </Link>
          <button onClick={openCart} className="relative transition-colors hover:text-primary">
            <ShoppingCart size={26} />
            {/* CART COUNT BADGE: Uses Red ('bg-accent') */}
            {cartCount > 0 && (<span className="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full -top-2 -right-2 bg-accent">{cartCount}</span>)}
          </button>
          <button className="p-2 md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU: Black background ('bg-brand-black') */}
      <div className={`absolute top-full left-0 w-full bg-brand-black shadow-lg md:hidden transition-all duration-300 ease-in-out z-20 ${isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="flex flex-col items-center py-10 space-y-6">
          {navLinks.map((link) => (
            <div key={link.label} className="w-full text-center">
              {link.subMenu ? (
                <>
                  <button onClick={() => setOpenDropdown(openDropdown === link.label ? null : link.label)} className="flex items-center justify-center w-full gap-2 text-lg font-bold tracking-wider uppercase">
                    {link.label}
                    <ChevronDown size={20} className={`transition-transform duration-300 ${openDropdown === link.label ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openDropdown === link.label ? 'max-h-96' : 'max-h-0'}`}>
                    <div className="flex flex-col items-center pt-4 space-y-4">
                      {link.subMenu.map((subLink) => (
                        <Link key={subLink.label} href={subLink.href} onClick={handleLinkClick} 
                          // MOBILE SUB-LINKS: Active is Red ('text-accent'), hover is Green ('hover:text-primary')
                          className={`text-base hover:text-primary ${pathname === subLink.href ? 'text-accent' : ''}`}>
                          {subLink.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <Link href={link.href!} onClick={handleLinkClick} 
                  // MOBILE LINKS: Active/hover is Green ('text-primary')
                  className={`text-lg uppercase font-bold tracking-wider hover:text-primary ${pathname === link.href ? 'text-primary' : ''}`}>
                  {link.label}
                </Link>
              )}
            </div>
          ))}
          <div className="w-3/4 pt-6 mt-4 border-t border-gray-700">
            <Link href="/login" onClick={handleLinkClick} className="flex items-center justify-center gap-3 text-lg font-bold tracking-wider uppercase hover:text-primary">
              <User size={26} /> <span>Account</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;