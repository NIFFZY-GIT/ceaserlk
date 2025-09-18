"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';

// Logo component
const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

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
    passwordsMatch: false
  });

  const validatePassword = (newPassword: string, confirmPass: string) => {
    setPasswordValidation({
      minLength: newPassword.length >= 8,
      hasUpperCase: /[A-Z]/.test(newPassword),
      hasLowerCase: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
      passwordsMatch: newPassword === confirmPass && newPassword.length > 0
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

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(Boolean);
  };

  // Step 1: Send verification code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
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
        throw new Error(data.error || 'Failed to send verification code');
      }

      setCurrentStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
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
        throw new Error(data.error || 'Invalid verification code');
      }

      setCurrentStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isPasswordValid()) {
      setError('Please ensure your password meets all requirements');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          code: verificationCode, 
          newPassword: password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setCurrentStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'email':
        return (
          <div>
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight text-black">Forgot Password?</h2>
              <p className="mt-2 text-gray-600">Enter your email to receive a verification code</p>
            </div>
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="relative">
                <Mail className="absolute w-5 h-5 text-gray-400 top-3.5 left-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3 pl-12 pr-4 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your email address"
                  required
                />
              </div>
              {error && (
                <div className="flex items-center p-3 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                  <AlertCircle className="w-5 h-5 mr-2"/>
                  <span className="font-medium">{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 font-bold tracking-wider text-white uppercase transition-all duration-300 rounded-lg bg-accent hover:bg-red-500 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          </div>
        );

      case 'verify':
        return (
          <div>
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight text-black">Check Your Email</h2>
              <p className="mt-2 text-gray-600">We sent a 6-digit code to <span className="font-medium">{email}</span></p>
            </div>
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full py-3 px-4 text-center text-2xl font-mono tracking-widest text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              {error && (
                <div className="flex items-center p-3 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                  <AlertCircle className="w-5 h-5 mr-2"/>
                  <span className="font-medium">{error}</span>
                </div>
              )}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full py-3 font-bold tracking-wider text-white uppercase transition-all duration-300 rounded-lg bg-accent hover:bg-red-500 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSendCode({ preventDefault: () => {} } as React.FormEvent)}
                  className="w-full py-2 text-sm text-primary hover:underline"
                >
                  Didn&apos;t receive the code? Resend
                </button>
              </div>
            </form>
          </div>
        );

      case 'reset':
        return (
          <div>
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight text-black">Set New Password</h2>
              <p className="mt-2 text-gray-600">Create a strong password for your account</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="relative">
                <Lock className="absolute w-5 h-5 text-gray-400 top-3.5 left-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full py-3 pl-12 pr-12 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="New Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 rounded-r-lg hover:text-primary"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute w-5 h-5 text-gray-400 top-3.5 left-4" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className="w-full py-3 pl-12 pr-12 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Confirm New Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 rounded-r-lg hover:text-primary"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Password Requirements */}
              {password && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="mb-3 text-sm font-medium text-gray-700">Password Requirements:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { key: 'minLength', label: 'At least 8 characters', valid: passwordValidation.minLength },
                      { key: 'hasUpperCase', label: 'One uppercase letter', valid: passwordValidation.hasUpperCase },
                      { key: 'hasLowerCase', label: 'One lowercase letter', valid: passwordValidation.hasLowerCase },
                      { key: 'hasNumber', label: 'One number', valid: passwordValidation.hasNumber },
                      { key: 'hasSpecialChar', label: 'One special character', valid: passwordValidation.hasSpecialChar },
                      { key: 'passwordsMatch', label: 'Passwords match', valid: passwordValidation.passwordsMatch }
                    ].map(({ key, label, valid }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${valid ? 'bg-green-500' : 'bg-gray-300'}`}>
                          {valid && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm ${valid ? 'text-green-600' : 'text-gray-500'}`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center p-3 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                  <AlertCircle className="w-5 h-5 mr-2"/>
                  <span className="font-medium">{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !isPasswordValid()}
                className="w-full py-3 font-bold tracking-wider text-white uppercase transition-all duration-300 rounded-lg bg-accent hover:bg-red-500 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-black mb-4">Password Reset Successful!</h2>
            <p className="text-gray-600 mb-8">Your password has been successfully reset. You can now sign in with your new password.</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 font-bold tracking-wider text-white uppercase transition-all duration-300 rounded-lg bg-accent hover:bg-red-500 hover:shadow-lg hover:-translate-y-0.5"
            >
              Sign In Now
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image 
          src="/images/image.jpg" 
          alt="Password reset illustration" 
          fill 
          style={{ objectFit: 'cover' }} 
          priority 
        />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white bg-gradient-to-t from-black/80 via-primary/60 to-transparent">
          <h1 className="text-5xl font-extrabold tracking-tight uppercase">Secure Your Account</h1>
          <p className="max-w-md mt-4 text-lg text-white/90">Reset your password securely and get back to achieving your goals.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <Link href="/" className="flex justify-center mb-6 lg:justify-start">
              <Logo />
            </Link>
            {currentStep !== 'email' && currentStep !== 'success' && (
              <button
                onClick={() => {
                  if (currentStep === 'verify') setCurrentStep('email');
                  if (currentStep === 'reset') setCurrentStep('verify');
                }}
                className="flex items-center mb-4 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
            )}
          </div>
          
          {renderStepContent()}
          
          {currentStep !== 'success' && (
            <p className="mt-8 text-sm text-center text-gray-600">
              Remember your password?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;