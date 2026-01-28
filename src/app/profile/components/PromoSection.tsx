'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Copy, 
  Check, 
  Share2, 
  Truck, 
  Loader2, 
  ExternalLink,
  MessageCircle,
  Facebook,
  Twitter
} from 'lucide-react';

interface Referral {
  id: string;
  referredUserName: string;
  createdAt: string;
}

interface PromoData {
  promoCode: string;
  referralLink: string;
  shareMessage: string;
  hasFreeDeliveryForLife: boolean;
  referralCount: number;
  referrals: Referral[];
}

export default function PromoSection() {
  const [promoData, setPromoData] = useState<PromoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'link' | 'message' | null>(null);

  const fetchPromoData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/promo');
      
      if (!response.ok) {
        throw new Error('Failed to fetch promo data');
      }

      const data = await response.json();
      setPromoData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromoData();
  }, [fetchPromoData]);

  const copyToClipboard = async (text: string, field: 'link' | 'message') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareViaWhatsApp = () => {
    if (!promoData) return;
    const encodedMessage = encodeURIComponent(promoData.shareMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const shareViaFacebook = () => {
    if (!promoData) return;
    const encodedUrl = encodeURIComponent(promoData.referralLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
  };

  const shareViaTwitter = () => {
    if (!promoData) return;
    const encodedMessage = encodeURIComponent(promoData.shareMessage);
    window.open(`https://twitter.com/intent/tweet?text=${encodedMessage}`, '_blank');
  };

  const shareNative = async () => {
    if (!promoData) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Unlock free delivery',
          text: promoData.shareMessage,
          url: promoData.referralLink,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchPromoData}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!promoData) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Banner - Marketing Pop */}
      {!promoData.hasFreeDeliveryForLife && (
        <div className="relative overflow-hidden p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border border-primary/30">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary rounded-full animate-pulse">
                Limited Offer
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-1 sm:mb-2">
              🚚 Unlock free delivery
            </h2>
            <p className="text-sm sm:text-base text-gray-300 max-w-md">
              Invite just <span className="text-primary font-bold">ONE friend</span> to sign up and unlock unlimited free shipping on every order!
            </p>
          </div>
        </div>
      )}

      {/* Unlocked Banner */}
      {promoData.hasFreeDeliveryForLife && (
        <div className="relative overflow-hidden p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-400/20 to-teal-500/20 border border-emerald-500/40">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-400">
                ✨ Free delivery unlocked!
              </h2>
              <p className="text-sm sm:text-base text-gray-300">
                You&apos;ve earned unlimited free shipping on all orders. Enjoy! 🎉
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Share Buttons - Prominent */}
      <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50">
        <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">
          📤 Share & Unlock
        </label>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <button
            onClick={shareViaWhatsApp}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/30 active:scale-95 sm:hover:scale-105 transition-all"
          >
            <MessageCircle className="w-5 h-5 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-sm font-semibold">WhatsApp</span>
          </button>
          <button
            onClick={shareViaFacebook}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-[#1877F2]/20 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/30 active:scale-95 sm:hover:scale-105 transition-all"
          >
            <Facebook className="w-5 h-5 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-sm font-semibold">Facebook</span>
          </button>
          <button
            onClick={shareViaTwitter}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 text-[#1DA1F2] hover:bg-[#1DA1F2]/30 active:scale-95 sm:hover:scale-105 transition-all"
          >
            <Twitter className="w-5 h-5 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-sm font-semibold">Twitter</span>
          </button>
        </div>
        
        {/* Full-width buttons row */}
        <div className="grid grid-cols-2 gap-2 mt-2 sm:mt-3">
          <button
            onClick={() => copyToClipboard(promoData.shareMessage, 'link')}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-700 active:scale-95 sm:hover:scale-105 transition-all"
          >
            {copiedField === 'link' ? (
              <>
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                <span className="text-xs sm:text-sm font-semibold text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-semibold">Copy</span>
              </>
            )}
          </button>
          <button
            onClick={shareNative}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 active:scale-95 sm:hover:scale-105 transition-all"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-semibold">Share</span>
          </button>
        </div>
      </div>

      {/* How it Works - Compact */}
      <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/20">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          How It Works
        </h3>
        <ol className="space-y-2 text-xs sm:text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] sm:text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span>Share your code with a friend</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] sm:text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span>They sign up using your code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-bold flex items-center justify-center">
              ✓
            </span>
            <span className="text-emerald-400 font-semibold">You unlock free delivery!</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
