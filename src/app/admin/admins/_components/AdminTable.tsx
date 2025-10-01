"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

export interface AdminData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

interface CurrentUser {
    userId: string;
}

export default function AdminTable({ admins }: { admins: AdminData[] }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch the current user's ID so we can disable the demote button for them
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.userId) setCurrentUser(data);
      });
  }, []);

  const handleDemote = async (adminId: string, adminName: string) => {
    if (!window.confirm(`Are you sure you want to demote "${adminName}" to a regular user? Their admin privileges will be revoked.`)) {
      return;
    }

    setUpdatingId(adminId);
    try {
      const response = await fetch(`/api/admin/admins/${adminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'USER' }),
      });
      if (!response.ok) throw new Error('Failed to demote admin.');
      
      // Refresh the server component data to update the list
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Could not demote admin.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!admins || admins.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No admins found.</p>
      </div>
    );
  }

  const formatDate = (value: string) => new Date(value).toLocaleDateString();
  const getInitials = (first: string, last: string) => {
    const firstInitial = first?.[0] ?? '';
    const lastInitial = last?.[0] ?? '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'A';
  };

  const renderDemoteButton = (
    admin: AdminData,
    className = 'inline-flex items-center p-2 text-sm text-red-600 rounded-md hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50',
  ) => {
    const isSelf = currentUser?.userId === admin.id;
    const isLoading = updatingId === admin.id;

    return (
      <button
        onClick={() => handleDemote(admin.id, `${admin.first_name} ${admin.last_name}`)}
        disabled={isLoading || isSelf}
        className={className}
        title={isSelf ? 'You cannot demote yourself' : 'Demote to User'}
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 md:hidden">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/60 p-5 shadow-sm transition hover:border-slate-300 hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white">
                {getInitials(admin.first_name, admin.last_name)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {admin.first_name} {admin.last_name}
                    </h3>
                    <p className="text-sm text-slate-500">{admin.email}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                    Admin since {formatDate(admin.created_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {renderDemoteButton(
                admin,
                'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50',
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Admin Since</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {admin.first_name} {admin.last_name}
                </td>
                <td className="px-4 py-3 text-gray-600">{admin.email}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(admin.created_at)}</td>
                <td className="px-4 py-3">
                  {renderDemoteButton(admin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}