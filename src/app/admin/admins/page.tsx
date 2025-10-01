import AdminTable from './_components/AdminTable';
import { resolveServerBaseUrl, serializeRequestCookies } from '@/lib/server-urls';

export interface AdminData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

async function getAdmins(): Promise<AdminData[]> {
  try {
    const baseUrl = await resolveServerBaseUrl();
    const serializedCookies = await serializeRequestCookies();
    const res = await fetch(`${baseUrl}/api/admin/admins`, {
      cache: 'no-store',
      headers: {
        ...(serializedCookies ? { cookie: serializedCookies } : {}),
        'Accept': 'application/json',
      },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch admins');
    return res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function AdminManagementPage() {
  const admins = await getAdmins();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
        {/* You could add an "Invite Admin" button here in the future */}
      </div>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <AdminTable admins={admins} />
      </div>
    </div>
  );
}