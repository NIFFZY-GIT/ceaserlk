// src/app/components/Navbar.tsx

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, User , CircleUser , X, ChevronDown } from 'lucide-react'; 
import { useCart } from '@/context/CartContext';

// Navigation links structure
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
  { href: '/contact', label: 'Contact' },
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


  return (
    <header className="bg-brand-white text-brand-black shadow-md sticky top-0 z-30">
      <nav className="container mx-auto px-6 py-5 flex justify-between items-center">
        {/* Logo */}
        <Link 
          href="/" 
          onClick={() => setIsMobileMenuOpen(false)}
          className="text-3xl font-extrabold text-primary hover:text-opacity-80 transition-colors tracking-wide"
        >
          CEASER
        </Link>

        {/* --- DESKTOP NAVIGATION with Colors --- */}
        <div className="hidden md:flex items-center space-x-10">
          {navLinks.map((link) => {
            // Check if a sub-menu item is active to highlight the parent
            const isSubMenuActive = link.subMenu?.some(sub => pathname === sub.href);
            const isActive = pathname === link.href || isSubMenuActive;

            return (
              <div 
                key={link.label}
                className="relative"
                onMouseEnter={() => link.subMenu && setOpenDropdown(link.label)}
                onMouseLeave={() => link.subMenu && setOpenDropdown(null)}
              >
                {link.subMenu ? (
                  <button className={`relative flex items-center gap-1 uppercase font-bold text-sm tracking-wider transition-colors ${isActive ? 'text-primary' : 'hover:text-primary'}`}>
                    {link.label}
                    <ChevronDown size={16} className={`transition-transform ${openDropdown === link.label ? 'rotate-180' : ''}`} />
                    {/* Active Indicator Underline */}
                    {isActive && <span className="absolute -bottom-6 left-0 w-full h-[3px] bg-accent rounded-full"></span>}
                  </button>
                ) : (
                  <Link 
                    href={link.href!}
                    className={`relative uppercase font-bold text-sm tracking-wider transition-colors ${isActive ? 'text-primary' : 'hover:text-primary'}`}
                  >
                    {link.label}
                    {/* Active Indicator Underline */}
                    {isActive && <span className="absolute -bottom-6 left-0 w-full h-[3px] bg-accent rounded-full"></span>}
                  </Link>
                )}

                {/* Dropdown Menu with Branded Hover */}
                {link.subMenu && openDropdown === link.label && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-52 bg-brand-white shadow-lg rounded-md py-2 z-40">
                    {link.subMenu.map((subLink) => (
                      <Link
                        key={subLink.label}
                        href={subLink.href}
                        className={`block px-5 py-3 text-sm font-medium transition-colors ${pathname === subLink.href ? 'text-accent' : 'text-brand-black hover:bg-primary hover:text-white'}`}
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

        {/* Right Side Icons */}
        <div className="flex items-center space-x-5">
          {/* Icons and mobile menu toggle remain the same */}
          <Link href="/login" className="hover:text-primary transition-colors hidden md:block"> <CircleUser size={26} /> </Link>
          <button onClick={openCart} className="relative hover:text-primary transition-colors">
            <ShoppingCart size={26} />
            {cartCount > 0 && (<span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">{cartCount}</span>)}
          </button>
          <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* --- MOBILE MENU --- */}
      {/* Mobile menu logic remains largely the same, but inherits the updated links */}
      <div className={`absolute top-full left-0 w-full bg-brand-white shadow-lg md:hidden transition-transform duration-300 ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-[150%]'}`}>
        {/* Content is the same as before */}
        <div className="flex flex-col items-center space-y-6 py-10">
          {navLinks.map((link) => (
            <div key={link.label} className="w-full text-center">
              {link.subMenu ? (
                <>
                  <button onClick={() => setOpenDropdown(openDropdown === link.label ? null : link.label)} className="flex items-center justify-center w-full gap-2 text-lg uppercase font-bold tracking-wider">
                    {link.label}
                    <ChevronDown size={20} className={`transition-transform ${openDropdown === link.label ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openDropdown === link.label ? 'max-h-96' : 'max-h-0'}`}>
                    <div className="flex flex-col items-center space-y-4 pt-4">
                      {link.subMenu.map((subLink) => (
                        <Link key={subLink.label} href={subLink.href} onClick={() => setIsMobileMenuOpen(false)} className={`text-base hover:text-primary ${pathname === subLink.href ? 'text-accent' : ''}`}>
                          {subLink.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <Link href={link.href!} onClick={() => setIsMobileMenuOpen(false)} className={`text-lg uppercase font-bold tracking-wider hover:text-primary ${pathname === link.href ? 'text-primary' : ''}`}>
                  {link.label}
                </Link>
              )}
            </div>
          ))}
          <div className="border-t border-gray-200 w-3/4 pt-6 mt-4">
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-3 text-lg uppercase font-bold tracking-wider hover:text-primary">
              <User size={26} /> <span>Account</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;