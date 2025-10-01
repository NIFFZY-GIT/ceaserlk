import AdminTable from './_components/AdminTable';
import { resolveServerBaseUrl, serializeRequestCookies } from '@/lib/server-urls';
import { CalendarClock, ShieldCheck, UserPlus } from 'lucide-react';

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
  const totalAdmins = admins.length;
  const dateNow = new Date();
  const thisMonthCount = admins.filter((admin) => {
    const created = new Date(admin.created_at);
    return (
      created.getFullYear() === dateNow.getFullYear() &&
      created.getMonth() === dateNow.getMonth()
    );
  }).length;
  const newestAdmin = admins
    .map((admin) => ({ admin, created: new Date(admin.created_at) }))
    .sort((a, b) => b.created.getTime() - a.created.getTime())[0]?.admin;

  const formatter = new Intl.NumberFormat('en-US');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
        {/* You could add an "Invite Admin" button here in the future */}
      </div>
      {!!totalAdmins && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-primary/10 via-primary/5 to-white p-4 text-primary shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total admins</p>
                <p className="text-base font-semibold text-slate-900">{formatter.format(totalAdmins)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white p-4 text-emerald-700 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Added this month</p>
                <p className="text-base font-semibold text-slate-900">{formatter.format(thisMonthCount)}</p>
              </div>
            </div>
          </div>
          {newestAdmin && (
            <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-slate-200 via-slate-100 to-white p-4 text-slate-700 shadow-sm backdrop-blur transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
                  <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Newest admin</p>
                  <p className="text-base font-semibold text-slate-900">
                    {newestAdmin.first_name} {newestAdmin.last_name}
                  </p>
                  <p className="text-xs text-slate-500">Joined {new Date(newestAdmin.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
        <AdminTable admins={admins} />
      </div>
    </div>
  );
}