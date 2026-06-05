import { AdminAuthProvider } from '../components/admin/AdminAuthContext';
import LogoDikiDiki from '../components/LogoDikiDiki';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 24px', background: '#0a0a0f',
          borderBottom: '1px solid #1e1e2e',
        }}>
          <LogoDikiDiki width={140} />
          <span style={{ fontSize: 11, color: '#4a4a6a', fontWeight: 600 }}>Panel Administrateur</span>
        </div>
        {children}
      </div>
    </AdminAuthProvider>
  );
}
