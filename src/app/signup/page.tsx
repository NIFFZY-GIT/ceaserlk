"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Chrome,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Palette,
  Phone,
  Sparkles,
  Tag,
  User,
  Loader2,
  ArrowRight,
  Gift,
  CheckCircle2
} from 'lucide-react';

import AuthLayout from '@/app/components/auth/AuthLayout';

const SignUpPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    terms: false,
    promoCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Promo code validation state
  const [promoValidation, setPromoValidation] = useState<{
    valid: boolean;
    message?: string;
    referrerName?: string;
    error?: string;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Pre-fill promo code from URL if present
  useEffect(() => {
    const promoFromUrl = searchParams.get('promo');
    if (promoFromUrl) {
      setFormData(prev => ({ ...prev, promoCode: promoFromUrl }));
    }
  }, [searchParams]);

  const handleGoogleSignup = () => {
    setGoogleLoading(true);
    setError(null);
    window.location.href = '/api/auth/google?mode=signup';
  };

  // Validate promo code with debounce
  const validatePromoCode = useCallback(async (code: string) => {
    if (!code || code.length < 4) {
      setPromoValidation(null);
      return;
    }

    setValidatingPromo(true);
    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCode: code }),
      });
      const data = await response.json();
      setPromoValidation(data);
    } catch {
      setPromoValidation({ valid: false, message: 'Failed to validate promo code' });
    } finally {
      setValidatingPromo(false);
    }
  }, []);

  // Debounce promo code validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.promoCode) {
        validatePromoCode(formData.promoCode);
      } else {
        setPromoValidation(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.promoCode, validatePromoCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const errorData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(errorData.error || errorData.details || 'An unknown error occurred.');
      }

      router.push('/login?signup=success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const heroHighlights = [
    {
      icon: <Sparkles className="h-5 w-5 text-amber-500" />,
      title: 'Motivational Drops',
      description: 'Snag limited-release creative tees before they sell out.',
    },
    {
      icon: <Tag className="h-5 w-5 text-indigo-500" />,
      title: 'Member Bundles',
      description: 'Unlock curated pack pricing on confidence-boosting fits.',
    },
    {
      icon: <Palette className="h-5 w-5 text-emerald-500" />,
      title: 'Creative Styling',
      description: 'Get weekly outfit inspo built around bold CEASAR artwork.',
    },
    {
      icon: <Mail className="h-5 w-5 text-rose-500" />,
      title: 'The Blueprint',
      description: 'Hear the inspiration behind every motivational graphic.',
    },
  ];

  return (
    <AuthLayout
      formTitle="Join the Empire"
      formSubtitle=""
      hero={{
        eyebrow: 'CEASAR Designs Studio',
        title: 'Those Who Aim Higher, Choose CEASAR',
        description:
          'Creators, athletes, and visionaries wear CEASAR when they want a shirt that speaks as loudly as they do.',
        highlights: heroHighlights,
      }}
      footer={
        <div className="space-y-4 w-full">
            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Or join with</span>
                <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Connecting...</>
              ) : (
                <><Chrome className="h-5 w-5" /> Continue with Google</>
              )}
            </button>
        </div>
      }
      bottomSlot={
        <p className="text-slate-500 text-sm">
          Already a member?{' '}
          <Link href="/login" className="font-bold text-white hover:text-indigo-200 transition-colors underline-offset-4 hover:underline">
            Sign in to your account
          </Link>
        </p>
      }
    >
      <motion.form 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit} 
        className="space-y-4"
      >
        {/* Name Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="group">
            <label htmlFor="firstName" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 transition-colors group-focus-within:text-slate-900">
              First name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-11 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-400"
                placeholder="Jordan"
              />
            </div>
          </div>
          <div className="group">
            <label htmlFor="lastName" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 transition-colors group-focus-within:text-slate-900">
              Last name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-11 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-400"
                placeholder="Taylor"
              />
            </div>
          </div>
        </div>

        {/* Email Field */}
        <div className="group">
          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 transition-colors group-focus-within:text-slate-900">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-11 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-400"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Phone Field */}
        <div className="group">
          <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 transition-colors group-focus-within:text-slate-900">
            Phone <span className="text-slate-300 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-11 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-400"
              placeholder="+94 77 000 0000"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="group">
          <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 transition-colors group-focus-within:text-slate-900">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-11 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-400"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center rounded-lg px-3 text-slate-400 transition hover:text-slate-900"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Promo Code Field */}
        <div className="group">
          <label htmlFor="promoCode" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 transition-colors group-focus-within:text-slate-900">
            Promo Code <span className="text-slate-300 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <Gift className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
              promoValidation?.valid ? 'text-emerald-500' : 'text-slate-400 group-focus-within:text-slate-900'
            }`} />
            <input
              id="promoCode"
              name="promoCode"
              type="text"
              value={formData.promoCode}
              onChange={handleChange}
              className={`block w-full rounded-xl border bg-slate-50/50 px-11 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 placeholder:text-slate-400 uppercase ${
                promoValidation?.valid 
                  ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/5' 
                  : promoValidation && !promoValidation.valid 
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/5' 
                    : 'border-slate-200 focus:border-slate-900'
              }`}
              placeholder="Enter promo code"
            />
            {validatingPromo && (
              <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
            {!validatingPromo && promoValidation?.valid && (
              <CheckCircle2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
            )}
          </div>
          <AnimatePresence mode="wait">
            {promoValidation && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mt-2 text-xs font-medium ${
                  promoValidation.valid ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {promoValidation.valid 
                  ? `🎉 ${promoValidation.message || 'Valid promo code! You\'ll get free delivery.'}` 
                  : promoValidation.message || promoValidation.error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Terms Checkbox */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/30 cursor-pointer transition-all hover:bg-slate-50 focus-within:ring-2 focus-within:ring-slate-900/5">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            checked={formData.terms}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="text-xs font-medium text-slate-500 leading-relaxed">
            I agree to the{' '}
            <Link href="/terms-conditions" className="text-slate-900 font-bold hover:underline">Terms</Link> and{' '}
            <Link href="/privacy-policy" className="text-slate-900 font-bold hover:underline">Privacy Policy</Link>.
          </span>
        </label>

        {/* Error Messaging */}
        <AnimatePresence mode="wait">
            {error && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
            >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
            </motion.div>
            )}
        </AnimatePresence>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl transition-all hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </motion.form>
    </AuthLayout>
  );
};

export default SignUpPage;