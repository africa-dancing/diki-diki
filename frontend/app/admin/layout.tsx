import { AdminAuthProvider } from "../components/admin/AdminAuthContext";
import { AdminTopBar } from "../components/admin/AdminTopBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminTopBar />
      <div>
        {children}
      </div>
    </AdminAuthProvider>
  );
}
