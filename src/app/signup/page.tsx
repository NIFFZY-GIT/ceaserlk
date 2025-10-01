"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';

import AuthLayout from '@/app/components/auth/AuthLayout';

const SignUpPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  
  // State for form data, loading, and errors
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

  // Generic handler for text inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Form submission handler
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        let message = 'An unknown error occurred.';

        if (errorData) {
          if (Array.isArray(errorData.details)) {
            const issues = errorData.details
              .map((issue: { message?: string }) => issue?.message)
              .filter(Boolean);
            if (issues.length > 0) {
              message = issues.join(', ');
            }
          } else if (typeof errorData.details === 'string' && errorData.details.trim().length > 0) {
            message = errorData.details;
          }

          if (typeof errorData.error === 'string' && errorData.error.trim().length > 0) {
            message = errorData.details && message !== errorData.error
              ? `${errorData.error}: ${message}`
              : errorData.error;
          }
        }

        throw new Error(message);
      }

      // On success, redirect to the login page
      router.push('/login');

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const heroHighlights = [
    {
      icon: <Sparkles className="h-4 w-4" />,
      title: 'Motivational drops',
      description: 'Snag limited-release creative tees before they sell out.',
    },
    {
      icon: <Tag className="h-4 w-4" />,
      title: 'Member bundles',
      description: 'Unlock curated pack pricing on confidence-boosting fits.',
    },
    {
      icon: <Palette className="h-4 w-4" />,
      title: 'Creative styling tips',
      description: 'Get weekly outfit inspo built around bold Ceaser artwork.',
    },
    {
      icon: <Mail className="h-4 w-4" />,
      title: 'Behind-the-print stories',
      description: 'Hear the inspiration behind every motivational graphic.',
    },
  ];

  return (
    <AuthLayout
      formTitle="Create your Ceaser Designs account"
      formSubtitle="Be first in line for limited-run motivational tees, surprise restocks, and styling notes."
      hero={{
        eyebrow: 'Ceaser Designs Studio',
        title: 'Fuel your wardrobe with creative energy',
        description:
          'Creators, athletes, and visionaries wear Ceaser when they want a shirt that speaks as loudly as they do.',
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
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
            Sign in to keep inspiring
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label htmlFor="firstName" className="text-sm font-medium text-slate-500">
            First name
            <div className="relative mt-2">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="block w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                placeholder="Jordan"
              />
            </div>
          </label>
          <label htmlFor="lastName" className="text-sm font-medium text-slate-500">
            Last name
            <div className="relative mt-2">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="block w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                placeholder="Taylor"
              />
            </div>
          </label>
        </div>

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

        <label htmlFor="phone" className="text-sm font-medium text-slate-500">
          Phone number <span className="font-normal text-slate-400">(optional)</span>
          <div className="relative mt-2">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="block w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              placeholder="(+94) 77 555 2210"
            />
          </div>
        </label>

        <label htmlFor="password" className="text-sm font-medium text-slate-500">
          Password
          <div className="relative mt-2">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              placeholder="Create a strong password"
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
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            checked={formData.terms}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default SignUpPage;