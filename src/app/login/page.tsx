// src/app/login/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Chrome } from 'lucide-react'; // Icon for Google login

const LoginPage = () => {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      
      {/* --- Left Column: Branding & Motivational Image --- */}
      <div className="relative hidden lg:block">
        <Image
          src="/images/image.jpg" // A powerful, motivational image
          alt="Focused individual achieving a goal"
          fill
          style={{ objectFit: 'cover' }}
        />
        <div className="absolute inset-0 bg-primary/70 flex flex-col justify-end p-12 text-white">
          <h1 className="text-4xl font-extrabold tracking-tight uppercase">
            Welcome Back, Champion
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-md">
            The journey continues. Sign in to track your progress and gear up for your next victory.
          </p>
        </div>
      </div>

      {/* --- Right Column: Login Form --- */}
      <div className="flex items-center justify-center p-8 sm:p-12 bg-brand-white">
        <div className="w-full max-w-md">
          <div className="text-center lg:text-left mb-8">
            {/* Logo Image */}
            <Link href="/" className="inline-block mb-6">
              <Image
                src="/assets/logo1.png"
                alt="Ceaser Brand Logo"
                width={140}
                height={45}
                priority
              />
            </Link>
            <h2 className="text-3xl font-extrabold text-black">
              Sign In to Your Account
            </h2>
            <p className="mt-2 text-gray-600">
              Ready to conquer the day?
            </p>
          </div>

          <form className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-accent text-white font-bold rounded-md uppercase tracking-wider hover:bg-red-500 transition-colors duration-300"
              >
                Sign In
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 text-sm text-gray-500">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Social Login */}
          <div>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 text-black font-semibold rounded-md hover:bg-gray-100 transition-colors duration-300"
            >
              <Chrome size={20} />
              Sign in with Google
            </button>
          </div>

          <p className="mt-8 text-sm text-center text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;