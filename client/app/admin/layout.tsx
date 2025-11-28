import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - TokenTalon",
  description: "TokenTalon Admin Dashboard - Manage system parameters",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
