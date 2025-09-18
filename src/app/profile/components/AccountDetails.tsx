'use client';

import React, { useState } from 'react';
import type { User } from '@/lib/types';
import { Edit3, Eye, EyeOff, Lock, Check, X } from 'lucide-react';

export default function AccountDetails({ user, onSaveSuccess }: { user: User; onSaveSuccess: (user: User) => void; }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User>({ ...user });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false
  });
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Real-time password validation
    if (name === 'newPassword' || name === 'confirmPassword') {
      const newPasswordValue = name === 'newPassword' ? value : passwordData.newPassword;
      const confirmPasswordValue = name === 'confirmPassword' ? value : passwordData.confirmPassword;
      
      validatePassword(newPasswordValue, confirmPasswordValue);
    }
  };

  const validatePassword = (newPassword: string, confirmPassword: string) => {
    setPasswordValidation({
      minLength: newPassword.length >= 8,
      hasUpperCase: /[A-Z]/.test(newPassword),
      hasLowerCase: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
      passwordsMatch: newPassword === confirmPassword && newPassword.length > 0
    });
  };

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(Boolean);
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowPasswordChange(false);
    setFormData({ ...user });
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswords({ currentPassword: false, newPassword: false, confirmPassword: false });
    setPasswordValidation({
      minLength: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumber: false,
      hasSpecialChar: false,
      passwordsMatch: false
    });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // Validate password change if requested
    if (showPasswordChange) {
      if (!passwordData.currentPassword) {
        setError('Current password is required');
        setIsSubmitting(false);
        return;
      }
      if (!passwordData.newPassword || !passwordData.confirmPassword) {
        setError('Please fill in all password fields');
        setIsSubmitting(false);
        return;
      }
      if (!isPasswordValid()) {
        setError('Please ensure your new password meets all requirements');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // Update profile data
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(showPasswordChange ? passwordData : {})
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile.');
      }
      
      const result = await response.json();
      onSaveSuccess(result.data);
      
      // Set success message
      const successMessage = showPasswordChange 
        ? 'Profile and password updated successfully!' 
        : 'Profile updated successfully!';
      setSuccess(successMessage);
      
      // Reset form state
      setIsEditing(false);
      setShowPasswordChange(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ currentPassword: false, newPassword: false, confirmPassword: false });
      setPasswordValidation({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
        passwordsMatch: false
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
      
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

          {/* Password Change Section */}
          <div className="pt-6 border-t border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-200">Security</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordChange(!showPasswordChange);
                  if (!showPasswordChange) {
                    setError(null);
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showPasswordChange
                    ? 'bg-red-600/20 text-red-300 border border-red-600/30 hover:bg-red-600/30'
                    : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                }`}
              >
                {showPasswordChange ? (
                  <span className="flex items-center space-x-2">
                    <X className="w-4 h-4" />
                    <span>Cancel Password Change</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Change Password</span>
                  </span>
                )}
              </button>
            </div>

            {showPasswordChange && (
              <div className="p-6 space-y-6 bg-gray-900/50 rounded-lg border border-gray-800">
                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block mb-2 text-sm font-semibold text-gray-300">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.currentPassword ? "text" : "password"}
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 pr-12 text-gray-200 transition border border-gray-700 rounded-lg bg-gray-800/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-gray-800"
                      placeholder="Enter your current password"
                      required={showPasswordChange}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('currentPassword')}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {showPasswords.currentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block mb-2 text-sm font-semibold text-gray-300">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.newPassword ? "text" : "password"}
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 pr-12 text-gray-200 transition border border-gray-700 rounded-lg bg-gray-800/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-gray-800"
                      placeholder="Enter your new password"
                      required={showPasswordChange}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPassword')}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {showPasswords.newPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block mb-2 text-sm font-semibold text-gray-300">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 pr-12 text-gray-200 transition border border-gray-700 rounded-lg bg-gray-800/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-gray-800"
                      placeholder="Confirm your new password"
                      required={showPasswordChange}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {showPasswords.confirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                {passwordData.newPassword && (
                  <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                    <h4 className="mb-3 text-sm font-medium text-gray-300">Password Requirements:</h4>
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
                          {valid ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <X className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`text-sm ${valid ? 'text-green-400' : 'text-gray-400'}`}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-green-400" />
                <p className="text-sm font-medium text-green-300">{success}</p>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <X className="w-5 h-5 text-red-400" />
                <p className="text-sm font-medium text-red-300">{error}</p>
              </div>
            </div>
          )}
          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end pt-6 space-y-3 space-y-reverse sm:space-y-0 sm:space-x-4">
            <button 
              type="button" 
              onClick={handleCancel}
              className="px-8 py-3 font-bold tracking-wider text-gray-300 uppercase transition-all border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || (showPasswordChange && !isPasswordValid())}
              className={`px-8 py-3 font-bold tracking-wider uppercase transition-all rounded-lg focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900 ${
                isSubmitting || (showPasswordChange && !isPasswordValid())
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </span>
              )}
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-green-400" />
                <p className="text-sm font-medium text-green-300">{success}</p>
              </div>
            </div>
          )}
          
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
        </>
      )}
    </div>
  );
}