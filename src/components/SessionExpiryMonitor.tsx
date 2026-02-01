"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSessionTokenFromCookie, getTimeUntilExpiry } from '@/lib/jwt-client';

/**
 * Component that monitors session expiration and shows a warning
 */
export function SessionExpiryMonitor() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    const checkExpiry = () => {
      const token = getSessionTokenFromCookie();
      if (!token) {
        setShowWarning(false);
        return;
      }

      const remaining = getTimeUntilExpiry(token);
      setTimeRemaining(remaining);

      // Show warning if less than 5 minutes remaining
      if (remaining > 0 && remaining <= 300) {
        setShowWarning(true);
      } else if (remaining <= 0) {
        // Token expired
        setShowWarning(false);
        logout();
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately
    checkExpiry();

    // Check every 30 seconds
    const interval = setInterval(checkExpiry, 30 * 1000);

    return () => clearInterval(interval);
  }, [user, logout]);

  if (!showWarning || !user) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg">
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="font-semibold">Your session is expiring soon</p>
          <p className="text-sm">
            Time remaining: {minutes}m {seconds}s
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="ml-4 bg-white text-yellow-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
        >
          Refresh Session
        </button>
      </div>
    </div>
  );
}
