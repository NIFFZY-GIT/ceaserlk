"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ArrowRight
} from 'lucide-react';

import AuthLayout from '@/app/components/auth/AuthLayout';

const SignUpPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    terms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      description: 'Get weekly outfit inspo built around bold Ceaser artwork.',
    },
    {
      icon: <Mail className="h-5 w-5 text-rose-500" />,
      title: 'The Blueprint',
      description: 'Hear the inspiration behind every motivational graphic.',
    },
  ];

  return (
    <AuthLayout
      formTitle="Join the Club"
      formSubtitle=""
      hero={{
        eyebrow: 'Ceaser Designs Studio',
        title: 'Fuel your wardrobe with creative energy',
        description:
          'Creators, athletes, and visionaries wear Ceaser when they want a shirt that speaks as loudly as they do.',
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
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
            >
            <Chrome className="h-5 w-5" /> Google
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