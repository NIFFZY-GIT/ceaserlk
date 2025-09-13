'use client';

import React, { useState } from 'react';
import type { User } from '@/lib/types';
import { Edit3 } from 'lucide-react';

export default function AccountDetails({ user, onSaveSuccess }: { user: User; onSaveSuccess: (user: User) => void; }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User>({ ...user });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ ...user });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to update profile.');
      const result = await response.json();
      onSaveSuccess(result.data);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-4 mb-8 border-b border-gray-800">
        <h1 className="text-3xl font-bold tracking-tight text-gray-100 uppercase md:text-4xl">
          Account Details
        </h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors border border-gray-700 rounded-md hover:text-primary"
          >
            <Edit3 className="w-4 h-4"/> Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Form Input: First Name */}
            <div>
              <label htmlFor="firstName" className="block mb-2 text-sm font-semibold text-gray-400">First Name</label>
              <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange}
                className="w-full px-3 py-2 text-gray-200 transition border border-gray-700 rounded-md bg-brand-black focus:border-primary focus:ring-2 focus:ring-primary/50" />
            </div>
            {/* Form Input: Last Name */}
            <div>
              <label htmlFor="lastName" className="block mb-2 text-sm font-semibold text-gray-400">Last Name</label>
              <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange}
                className="w-full px-3 py-2 text-gray-200 transition border border-gray-700 rounded-md bg-brand-black focus:border-primary focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          {/* Form Input: Email (Disabled) */}
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-semibold text-gray-400">Email Address</label>
            <input type="email" id="email" name="email" value={formData.email} disabled
              className="w-full px-3 py-2 text-gray-500 bg-gray-800 border border-gray-700 rounded-md cursor-not-allowed" />
          </div>
          {/* Form Input: Phone Number */}
          <div>
            <label htmlFor="phoneNumber" className="block mb-2 text-sm font-semibold text-gray-400">Phone Number</label>
            <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleChange}
              className="w-full px-3 py-2 text-gray-200 transition border border-gray-700 rounded-md bg-brand-black focus:border-primary focus:ring-2 focus:ring-primary/50" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {/* Action Buttons */}
          <div className="flex justify-end pt-4 space-x-4">
             <button type="button" onClick={handleCancel}
              className="px-8 py-3 font-bold tracking-wider text-gray-300 uppercase transition-colors border border-gray-700 rounded-md hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-8 py-3 font-bold tracking-wider uppercase transition-transform duration-300 rounded-md bg-primary text-primary-foreground hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6 text-base">
          <div className="grid grid-cols-3 gap-4">
            <p className="col-span-1 font-medium text-gray-400">Full Name</p>
            <p className="col-span-2 text-gray-100">{`${user.firstName} ${user.lastName}`}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <p className="col-span-1 font-medium text-gray-400">Email</p>
            <p className="col-span-2 text-gray-100">{user.email}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <p className="col-span-1 font-medium text-gray-400">Phone</p>
            <p className="col-span-2 text-gray-100">{user.phoneNumber || 'Not provided'}</p>
          </div>
        </div>
      )}
    </div>
  );
}