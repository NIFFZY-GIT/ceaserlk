"use client";

import { useState } from 'react';
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
  Package,
  Sparkles,
  Tag,
  Truck,
  Loader2,
  ArrowRight
} from 'lucide-react';

import AuthLayout from '@/app/components/auth/AuthLayout';
import { useAuth } from '@/context/AuthContext';

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prevState => ({ ...prevState, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Login failed');
      }

      const userData = data.user;
      login({
        userId: userData.userId,
        email: userData.email,
        firstName: userData.firstName,
        role: userData.role,
      });

      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (userData.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
      
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const heroHighlights = [
    {
      icon: <Package className="h-5 w-5 text-indigo-500" />,
      title: 'Order Vault',
      description: 'Access your curated history of motivational pieces.',
    },
    {
      icon: <Truck className="h-5 w-5 text-emerald-500" />,
      title: 'Real-time Tracking',
      description: 'Live status from the print shop to your porch.',
    },
    {
      icon: <Tag className="h-5 w-5 text-amber-500" />,
      title: 'Atelier Pricing',
      description: 'Exclusive bundle deals for registered members.',
    },
    {
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      title: 'VIP Previews',
      description: 'Early access to upcoming creative drops.',
    },
  ];

  return (
    <AuthLayout
      formTitle="Welcome Back to Ceasar"
      formSubtitle=""
      hero={{
        eyebrow: 'Member Access',
        title: 'Those Who Aim Higher, Choose CEASAR',
        description:
          'Success is a mindset. Luxury is a standard.CEASAR is worn by individuals building something greater.',
        highlights: heroHighlights,
      }}
      footer={
        <div className="space-y-4 w-full">
            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Or continue with</span>
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
        <p className="text-white/90 text-sm">
          New to the atelier?{' '}
          <Link href="/signup" className="font-bold text-white underline underline-offset-4 decoration-white/50 hover:decoration-white transition-colors">
            Create an account
          </Link>
        </p>
      }
    >
      <motion.form 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit} 
        className="space-y-5"
      >
        {/* Email Field */}
        <div className="group">
          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 transition-colors group-focus-within:text-slate-900">
            Email Address
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
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-12 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-400"
              placeholder="name@company.com"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="group">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-focus-within:text-slate-900">
              Password
            </label>
            <Link href="/forgot-password" title="Recover account" className="text-xs font-semibold text-slate-400 hover:text-slate-900 transition-colors">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-12 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 placeholder:text-slate-400"
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

        {/* Error Message */}
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
                Sign In
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </motion.form>
    </AuthLayout>
  );
};

export default LoginPage;