"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Chrome, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ... Logo component remains the same ...
const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
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

  // ... the rest of your JSX remains exactly the same ...
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src="/images/image.jpg" alt="Focused individual achieving a goal" fill style={{ objectFit: 'cover' }} priority />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white bg-gradient-to-t from-black/80 via-primary/60 to-transparent">
          <h1 className="text-5xl font-extrabold tracking-tight uppercase">Welcome Back, Champion</h1>
          <p className="max-w-md mt-4 text-lg text-white/90">The journey continues. Sign in to track your progress and gear up for your next victory.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <Link href="/" className="flex justify-center mb-6 lg:justify-start"><Logo /></Link>
            <h2 className="text-3xl font-extrabold tracking-tight text-black">Sign In to Your Account</h2>
            <p className="mt-2 text-gray-600">Ready to conquer the day?</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Mail className="absolute w-5 h-5 text-gray-400 top-3.5 left-4" />
              <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} className="w-full py-3 pl-12 pr-4 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Email Address"/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 sr-only">Password</label>
                <Link href="/forgot-password" className="ml-auto text-sm font-medium text-primary hover:underline">Forgot Password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute w-5 h-5 text-gray-400 top-3.5 left-4" />
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={formData.password} onChange={handleChange} className="w-full py-3 pl-12 pr-12 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Password"/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 rounded-r-lg hover:text-primary" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
             {error && (
              <div className="flex items-center p-3 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                <AlertCircle className="w-5 h-5 mr-2"/>
                <span className="font-medium">{error}</span>
              </div>
            )}
            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full py-3 font-bold tracking-wider text-white uppercase transition-all duration-300 rounded-lg bg-accent hover:bg-red-500 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed">
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>
          <div className="flex items-center my-8"><div className="flex-grow border-t border-gray-200"></div><span className="mx-4 text-sm font-medium text-gray-400">OR</span><div className="flex-grow border-t border-gray-200"></div></div>
          <div><button type="button" className="flex items-center justify-center w-full gap-3 px-4 py-3 font-semibold text-gray-800 transition-all duration-300 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:shadow-sm"><Chrome size={20} />Sign in with Google</button></div>
          <p className="mt-8 text-sm text-center text-gray-600">Don&apos;t have an account?{' '}<Link href="/signup" className="font-medium text-primary hover:underline">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;