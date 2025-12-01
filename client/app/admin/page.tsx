'use client';

import dynamic from 'next/dynamic';
import { AdminLoading } from '@/components/admin/AdminLoading';

const AdminDashboard = dynamic(
  () => import('@/components/admin/AdminDashboard').then(mod => ({ default: mod.AdminDashboard })),
  {
    ssr: false,
    loading: () => <AdminLoading />,
  }
);

export default function AdminPage() {
  return <AdminDashboard />;
}
