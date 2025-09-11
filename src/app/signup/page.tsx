"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import Link from 'next/link';
import Image from 'next/image';
import { Chrome, Mail, User, Lock, Eye, EyeOff, Phone, AlertCircle } from 'lucide-react';

// Logo component remains the same...
const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SignUpPage = () => {
  const router = useRouter(); // Initialize router for redirection
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
        const errorData = await response.json();
        // Handle both Zod validation errors and general errors
        throw new Error(errorData.error || 'An unknown error occurred.');
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

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src="/images/image.jpg" alt="Athlete preparing for a challenge" fill style={{ objectFit: 'cover' }} priority />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white bg-gradient-to-t from-black/80 via-primary/60 to-transparent">
          <h1 className="text-5xl font-extrabold tracking-tight uppercase">Join The Movement</h1>
          <p className="max-w-md mt-4 text-lg text-white/90">Become part of a community dedicated to ambition, discipline, and success. Your journey starts now.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <div className="flex justify-center mb-6 lg:justify-start"><Logo /></div>
            <h2 className="text-3xl font-extrabold tracking-tight text-black">Create Your Account</h2>
            <p className="mt-2 text-gray-600">Let&apos;s get started on your path to greatness.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="relative">
                <User className="absolute w-5 h-5 text-gray-400 top-3 left-4" />
                <input id="firstName" name="firstName" type="text" required value={formData.firstName} onChange={handleChange} className="w-full py-3 pl-12 pr-4 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="First Name"/>
              </div>
              <div className="relative">
                 <User className="absolute w-5 h-5 text-gray-400 top-3 left-4" />
                <input id="lastName" name="lastName" type="text" required value={formData.lastName} onChange={handleChange} className="w-full py-3 pl-12 pr-4 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Last Name"/>
              </div>
            </div>
            <div className="relative">
              <Mail className="absolute w-5 h-5 text-gray-400 top-3 left-4" />
              <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} className="w-full py-3 pl-12 pr-4 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Email Address"/>
            </div>
            <div className="relative">
              <Phone className="absolute w-5 h-5 text-gray-400 top-3 left-4" />
              <input id="phone" name="phone" type="tel" required value={formData.phone} onChange={handleChange} className="w-full py-3 pl-12 pr-4 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Phone Number"/>
            </div>
            <div className="relative">
              <Lock className="absolute w-5 h-5 text-gray-400 top-3 left-4" />
              <input id="password" name="password" type={showPassword ? "text" : "password"} required value={formData.password} onChange={handleChange} className="w-full py-3 pl-12 pr-12 text-black bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Password"/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 rounded-r-lg hover:text-primary" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="flex items-center">
              <input id="terms" name="terms" type="checkbox" required checked={formData.terms} onChange={handleChange} className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary"/>
              <label htmlFor="terms" className="block ml-2 text-sm text-gray-700">I agree to the <Link href="/terms" className="font-medium text-primary hover:underline">Terms of Service</Link></label>
            </div>
            {error && (
              <div className="flex items-center p-3 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                <AlertCircle className="w-5 h-5 mr-2"/>
                <span className="font-medium">{error}</span>
              </div>
            )}
            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full py-3 font-bold tracking-wider text-white uppercase transition-all duration-300 rounded-lg bg-accent hover:bg-red-500 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
          {/* ... Social Login and Sign In link ... */}
          <div className="flex items-center my-8"><div className="flex-grow border-t border-gray-200"></div><span className="mx-4 text-sm font-medium text-gray-400">OR</span><div className="flex-grow border-t border-gray-200"></div></div>
          <div><button type="button" className="flex items-center justify-center w-full gap-3 px-4 py-3 font-semibold text-gray-800 transition-all duration-300 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:shadow-sm"><Chrome size={20} />Sign up with Google</button></div>
          <p className="mt-8 text-sm text-center text-gray-600">Already have an account?{' '}<Link href="/login" className="font-medium text-primary hover:underline">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;