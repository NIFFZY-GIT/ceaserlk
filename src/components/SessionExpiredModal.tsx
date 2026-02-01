"use client";

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Modal that displays when session expires
 * Informs user and redirects to login after a delay
 */
export function SessionExpiredModal() {
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Check if session expired
    const isSessionExpired = sessionStorage.getItem('session_expired');
    if (isSessionExpired) {
      setShowModal(true);
      sessionStorage.removeItem('session_expired');

      // Countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = '/login';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, []);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 p-8 bg-gray-900 border border-red-500/50 rounded-lg shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-4">Session Expired</h2>

        {/* Message */}
        <div className="space-y-4 mb-6">
          <p className="text-gray-300 text-center">
            Your session has expired for security reasons. You will be redirected to the login page to sign in again.
          </p>
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400 text-center">
              <span className="font-semibold">Security Notice:</span> This is normal for inactive sessions. Your account is secure.
            </p>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-center mb-6">
          <p className="text-gray-400 text-sm">
            Redirecting in <span className="font-bold text-primary">{countdown}</span> seconds...
          </p>
          <div className="mt-3 w-full h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Button */}
        <button
          onClick={() => {
            window.location.href = '/login';
          }}
          className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
        >
          Sign In Now
        </button>
      </div>
    </div>
  );
}
