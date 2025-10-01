"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Palette,
  Sparkles,
  Tag,
} from 'lucide-react';

import AuthLayout from '@/app/components/auth/AuthLayout';

type Step = 'email' | 'verify' | 'reset' | 'success';

const ForgotPasswordPage = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false,
  });

  const validatePassword = (newPassword: string, confirmPass: string) => {
    setPasswordValidation({
      minLength: newPassword.length >= 8,
      hasUpperCase: /[A-Z]/.test(newPassword),
      hasLowerCase: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
      passwordsMatch: newPassword === confirmPass && newPassword.length > 0,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword, confirmPassword);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    validatePassword(password, newConfirmPassword);
  };

  const isPasswordValid = () => Object.values(passwordValidation).every(Boolean);

  const sendVerificationCode = async () => {
    if (!email) {
      setError('Please enter the email connected to your Ceaser account.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'We couldn’t send that reset code. Try again.');
      }

      setVerificationCode('');
      setCurrentStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t send that reset code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendVerificationCode();
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'The code you entered is incorrect.');
      }

      setCurrentStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The code you entered is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isPasswordValid()) {
      setError('Make sure your new password ticks every requirement.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'We couldn’t reset that password.');
      }

      setCurrentStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn’t reset that password.');
    } finally {
      setLoading(false);
    }
  };

  const heroHighlights = [
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Stay inspired',
      description: 'Regain access so you never miss the next motivational drop.',
    },
    {
      icon: <Tag className="w-4 h-4" />,
      title: 'Member perks intact',
      description: 'Your loyalty pricing and saved bundles pick up right where you left off.',
    },
    {
      icon: <Palette className="w-4 h-4" />,
      title: 'Saved looks secured',
      description: 'Keep every curated outfit and colourway ready once you sign back in.',
    },
  ];

  const formTitleMap: Record<Step, string> = {
    email: 'Forgot your password?',
    verify: 'Enter your reset code',
    reset: 'Set a new password',
    success: 'Password reset complete',
  };

  const formSubtitle = (() => {
    switch (currentStep) {
      case 'email':
        return 'Drop the email tied to your Ceaser Designs account and we’ll send a code.';
      case 'verify':
        return `We emailed a six-digit code to ${email || 'your inbox'}. Enter it below to continue.`;
      case 'reset':
        return 'Create a resilient password so your creative wardrobe stays protected.';
      case 'success':
        return 'You’re cleared to jump back in with your refreshed credentials.';
      default:
        return '';
    }
  })();

  const renderStepContent = () => {
    switch (currentStep) {
      case 'email':
        return (
          <form onSubmit={handleSendCode} className="space-y-6">
            <label htmlFor="reset-email" className="text-sm font-medium text-slate-500">
              Email address
              <div className="relative mt-2">
                <Mail className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-slate-400" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="block w-full px-12 py-3 text-sm font-medium transition bg-white border shadow-sm outline-none rounded-xl border-slate-200 text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  placeholder="you@ceaserfan.com"
                  required
                />
              </div>
            </label>
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 text-sm border rounded-2xl border-rose-100 bg-rose-50 text-rose-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:translate-y-0 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              {loading ? 'Sending code…' : 'Send reset code'}
            </button>
          </form>
        );

      case 'verify':
        return (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setCurrentStep('email')}
              className="inline-flex items-center gap-2 text-sm font-semibold transition text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label htmlFor="verification-code" className="sr-only">
                  Verification code
                </label>
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={event =>
                    setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="block w-full rounded-xl border border-slate-200 bg-white px-6 py-3 text-center text-2xl tracking-[0.4em] text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  placeholder="000000"
                  required
                />
              </div>
              {error && (
                <div className="flex items-start gap-3 px-4 py-3 text-sm border rounded-2xl border-rose-100 bg-rose-50 text-rose-700" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:translate-y-0 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
                >
                  {loading ? 'Verifying…' : 'Verify code'}
                </button>
                <button
                  type="button"
                  onClick={sendVerificationCode}
                  className="w-full text-sm font-semibold transition text-slate-500 hover:text-slate-900"
                >
                  Didn&apos;t get it? Resend the code
                </button>
              </div>
            </form>
          </div>
        );

      case 'reset':
        return (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setCurrentStep('verify')}
              className="inline-flex items-center gap-2 text-sm font-semibold transition text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <form onSubmit={handleResetPassword} className="space-y-6">
              <label htmlFor="new-password" className="text-sm font-medium text-slate-500">
                New password
                <div className="relative mt-2">
                  <Lock className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-slate-400" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    className="block w-full px-12 py-3 text-sm font-medium transition bg-white border shadow-sm outline-none rounded-xl border-slate-200 text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    placeholder="Create a strong passphrase"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 flex items-center px-3 transition rounded-lg right-3 text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              <label htmlFor="confirm-password" className="text-sm font-medium text-slate-500">
                Confirm password
                <div className="relative mt-2">
                  <Lock className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-slate-400" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className="block w-full px-12 py-3 text-sm font-medium transition bg-white border shadow-sm outline-none rounded-xl border-slate-200 text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    placeholder="Repeat it to double check"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 flex items-center px-3 transition rounded-lg right-3 text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              {password && (
                <div className="px-4 py-4 text-sm border rounded-2xl border-slate-200 bg-slate-50 text-slate-600">
                  <h4 className="text-sm font-semibold text-slate-700">Your password checklist</h4>
                  <div className="grid gap-2 mt-3 sm:grid-cols-2">
                    {[
                      { key: 'minLength', label: 'At least 8 characters', valid: passwordValidation.minLength },
                      { key: 'hasUpperCase', label: 'Includes an uppercase letter', valid: passwordValidation.hasUpperCase },
                      { key: 'hasLowerCase', label: 'Includes a lowercase letter', valid: passwordValidation.hasLowerCase },
                      { key: 'hasNumber', label: 'Contains a number', valid: passwordValidation.hasNumber },
                      { key: 'hasSpecialChar', label: 'Has a special character', valid: passwordValidation.hasSpecialChar },
                      { key: 'passwordsMatch', label: 'Matches the confirmation', valid: passwordValidation.passwordsMatch },
                    ].map(({ key, label, valid }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full ${valid ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                        >
                          {valid && <CheckCircle className="w-3 h-3" />}
                        </span>
                        <span className={valid ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 px-4 py-3 text-sm border rounded-2xl border-rose-100 bg-rose-50 text-rose-700" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isPasswordValid()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:translate-y-0 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-emerald-100">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-sm text-slate-500">
              Your password is updated. Keep the motivational energy rolling and sign in with your new credentials.
            </p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Return to sign in
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout
      formTitle={formTitleMap[currentStep]}
      formSubtitle={formSubtitle}
      hero={{
        eyebrow: 'Ceaser Designs Support',
        title: 'Reset your access and keep the creativity flowing',
        description:
          'Glitches happen. We’ll get you back into the Ceaser universe so you can keep wearing motivation on your sleeve.',
        highlights: heroHighlights,
      }}
      bottomSlot={
        currentStep === 'success' ? (
          <span>
            Need more help?{' '}
            <Link href="/contact" className="font-semibold text-white underline-offset-4 hover:underline">
              Reach our team
            </Link>
          </span>
        ) : (
          <span>
            Remember your password?{' '}
            <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
              Sign in instead
            </Link>
          </span>
        )
      }
    >
      {renderStepContent()}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;