"use client";

import { useState, useEffect } from "react";

interface Admin {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [adding, setAdding] = useState(false);

  // Fetch all admins
  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admins");
      if (!res.ok) throw new Error("Failed to fetch admins");
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add admin");
      }
      setForm({ first_name: "", last_name: "", email: "", password: "" });
      await fetchAdmins();
    } catch (err: any) {
      setError(err.message || "Failed to add admin");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveAdmin(email: string) {
    if (!window.confirm(`Remove admin ${email}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admins?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove admin");
      }
      await fetchAdmins();
    } catch (err: any) {
      setError(err.message || "Failed to remove admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Manage Admins</h1>
      <form onSubmit={handleAddAdmin} className="mb-8 space-y-4 bg-white p-6 rounded shadow">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="First Name"
            value={form.first_name}
            onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
            className="border p-2 rounded w-full"
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={form.last_name}
            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
            className="border p-2 rounded w-full"
            required
          />
        </div>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          className="border p-2 rounded w-full"
          required
        />
        <button
          type="submit"
          className="bg-primary text-white px-6 py-2 rounded font-semibold"
          disabled={adding}
        >
          {adding ? "Adding..." : "Add Admin"}
        </button>
      </form>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <h2 className="text-xl font-semibold mb-4">Current Admins</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="w-full border rounded">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => (
              <tr key={admin.user_id} className="border-t">
                <td className="p-2">{admin.first_name} {admin.last_name}</td>
                <td className="p-2">{admin.email}</td>
                <td className="p-2">
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => handleRemoveAdmin(admin.email)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
