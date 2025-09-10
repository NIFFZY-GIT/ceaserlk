// src/app/signup/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Chrome } from 'lucide-react'; // Using Chrome icon for Google as a common choice

const SignUpPage = () => {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      
      {/* --- Left Column: Branding & Motivational Image --- */}
      <div className="relative hidden lg:block">
        <Image
          src="/images/image.jpg" // A powerful, motivational image
          alt="Athlete preparing for a challenge"
          fill
          style={{ objectFit: 'cover' }}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white bg-primary/70">
          <h1 className="text-4xl font-extrabold tracking-tight uppercase">
            Join The Movement
          </h1>
          <p className="max-w-md mt-4 text-lg text-white/80">
            Become part of a community dedicated to ambition, discipline, and success. Your journey starts now.
          </p>
        </div>
      </div>

      {/* --- Right Column: Sign-up Form --- */}
      <div className="flex items-center justify-center p-8 sm:p-12 bg-brand-white">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            
            <h2 className="text-3xl font-extrabold text-black">
              Create Your Account
            </h2>
            <p className="mt-2 text-gray-600">
              Let&apos;s get started on your path to greatness.
            </p>
          </div>

          <form className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="(123) 456-7890"
              />
            </div>
            
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full px-4 py-3 font-bold tracking-wider text-white uppercase transition-colors duration-300 rounded-md bg-accent hover:bg-red-500"
              >
                Create Account
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 text-sm text-gray-500">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Social Login */}
          <div>
            <button
              type="button"
              className="flex items-center justify-center w-full gap-2 px-4 py-3 font-semibold text-black transition-colors duration-300 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              <Chrome size={20} />
              Sign up with Google
            </button>
          </div>

          <p className="mt-8 text-sm text-center text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;