'use client';

import { useState, useEffect } from 'react';
import { X, Gift, Truck, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const FreeDeliveryPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for new user from Google OAuth (URL param) or regular signup (sessionStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const isNewUserFromUrl = urlParams.get('newUser') === 'true';
    const isNewRegistration = sessionStorage.getItem('newUserRegistration');
    
    if (!isNewUserFromUrl && !isNewRegistration) return;

    // Clear the sessionStorage flag
    if (isNewRegistration) {
      sessionStorage.removeItem('newUserRegistration');
    }

    // Clean up the URL if newUser param exists
    if (isNewUserFromUrl) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('newUser');
      window.history.replaceState({}, '', newUrl.pathname + (newUrl.search || ''));
    }

    // Show popup after a brief delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleUnlock = () => {
    setIsOpen(false);
    router.push('/profile?tab=promo');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[90%] max-w-md"
          >
            <div className="relative overflow-hidden bg-black rounded-2xl shadow-2xl border border-gray-800">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors z-10"
                aria-label="Close popup"
              >
                <X size={18} />
              </button>

              {/* Decorative gradient orb using theme colors */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />

              {/* Content */}
              <div className="relative p-6 sm:p-8 text-center">
                {/* Icon using primary color */}
                <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <Truck className="w-8 h-8 text-white" />
                </div>

                {/* Welcome Message */}
                <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">
                  Welcome to CEASAR
                </p>

                {/* Heading */}
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  Unlock <span className="text-primary">FREE</span> Delivery!
                </h2>

                {/* Description */}
                <p className="text-gray-400 mb-6 text-sm sm:text-base leading-relaxed">
                  Share your unique promo code with friends and earn <strong className="text-white">free delivery</strong> on your next order when they make a purchase!
                </p>

                {/* Benefits */}
                <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Gift className="w-4 h-4 text-accent" />
                    <span>Your unique code</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Truck className="w-4 h-4 text-primary" />
                    <span>Free shipping</span>
                  </div>
                </div>

                {/* CTA Button using primary color */}
                <button
                  onClick={handleUnlock}
                  className="group w-full py-3.5 px-6 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Unlock Free Delivery
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Skip link */}
                <button
                  onClick={handleClose}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FreeDeliveryPopup;
