'use client';

import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(
  () => import('@/components/admin/AdminDashboard').then(mod => ({ default: mod.AdminDashboard })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading Admin Dashboard...</div>
      </div>
    ),
  }
);

export default function AdminPage() {
  return <AdminDashboard />;
}
