"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

  // Get redirect parameter from URL
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

      // We need the response body to determine the role
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let message = 'Login failed.';

        if (data) {
          if (Array.isArray(data.details)) {
            const issues = data.details
              .map((issue: { message?: string }) => issue?.message)
              .filter(Boolean);
            if (issues.length > 0) {
              message = issues.join(', ');
            }
          } else if (typeof data.details === 'string' && data.details.trim().length > 0) {
            message = data.details;
          }

          if (typeof data.error === 'string' && data.error.trim().length > 0) {
            message = data.details && message !== data.error
              ? `${data.error}: ${message}`
              : data.error;
          }
        }

        throw new Error(message);
      }

      // ==========================================================
      // CHANGE: CONDITIONAL REDIRECTION BASED ON ROLE AND REDIRECT PARAM
      // ==========================================================
      const userData = data.user;
      
      // Update auth context with user data
      login({
        userId: userData.userId,
        email: userData.email,
        firstName: userData.firstName,
        role: userData.role,
      });

      // Check if there's a redirect URL, otherwise use default routing
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (userData.role === 'ADMIN') {
        router.push('/admin/dashboard'); // Redirect admin to dashboard
      } else {
        router.push('/'); // Redirect regular users to the homepage
      }
      
      router.refresh(); // Refresh to update server-side state (like headers showing user is logged in)

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const heroHighlights = [
    {
      icon: <Package className="h-4 w-4" />,
      title: 'Order vault',
      description: 'Review past motivational tees, receipts, and saved sizes in one place.',
    },
    {
      icon: <Truck className="h-4 w-4" />,
      title: 'Doorstep tracking',
      description: 'Follow every creative drop from print shop to porch with live status.',
    },
    {
      icon: <Tag className="h-4 w-4" />,
      title: 'Member pricing',
      description: 'Grab bundle deals on bold statement shirts before they disappear.',
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      title: 'VIP previews',
      description: 'Preview the next motivational collection before the public launch.',
    },
  ];

  return (
    <AuthLayout
      formTitle="Welcome back to Ceaser Designs"
      formSubtitle="Manage your motivational wardrobe, track deliveries, and unlock member-only drops."
      hero={{
        eyebrow: 'Client Atelier Access',
        title: 'Tap into your creative shirt control room',
        description:
          'Restock alerts, delivery statuses, and print previews are waiting the moment you sign in.',
        highlights: heroHighlights,
      }}
      footer={
        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <Chrome className="h-5 w-5" /> Continue with Google
        </button>
      }
      bottomSlot={
        <span>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-white underline-offset-4 hover:underline">
            Join Ceaser Designs
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <label htmlFor="email" className="text-sm font-medium text-slate-500">
          Email address
          <div className="relative mt-2">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              placeholder="you@ceaserfan.com"
            />
          </div>
        </label>

        <div>
          <div className="flex items-center justify-between text-sm font-medium text-slate-500">
            <label htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-slate-900 underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-2">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              placeholder="Enter your secret passphrase"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center rounded-lg px-3 text-slate-500 transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:translate-y-0 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;