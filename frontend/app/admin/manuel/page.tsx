'use client';
// frontend/app/admin/manuel/page.tsx
// DKDK_MANUEL — Manuel de gestion du poste Admin (guide des 19 menus).
// La page est un document autonome servi depuis /public/manuel-admin.html,
// affiché en iframe dans la coque admin (sidebar + garde).
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';

export default function AdminManuelPage() {
  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
        <AdminSidebar />
        <div style={{ flex: 1, minWidth: 0 }}>
          <iframe
            src="/manuel-admin.html"
            title="Manuel administrateur Diki-Diki"
            style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
          />
        </div>
      </div>
    </AdminGuard>
  );
}
