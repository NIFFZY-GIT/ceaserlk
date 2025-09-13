"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { AdminData } from '../page';

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
    return <div className="py-12 text-center text-gray-500"><p>No admins found.</p></div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead><tr className="border-b bg-gray-50"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Admin Since</th><th className="px-4 py-3">Actions</th></tr></thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{admin.first_name} {admin.last_name}</td>
              <td className="px-4 py-3 text-gray-600">{admin.email}</td>
              <td className="px-4 py-3 text-gray-600">{new Date(admin.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <button 
                  onClick={() => handleDemote(admin.id, `${admin.first_name} ${admin.last_name}`)}
                  disabled={updatingId === admin.id || currentUser?.userId === admin.id}
                  className="inline-flex items-center p-2 text-sm text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={currentUser?.userId === admin.id ? "You cannot demote yourself" : "Demote to User"}
                >
                  {updatingId === admin.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}