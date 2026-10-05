'use client';
// frontend/app/admin/manuel/page.tsx
// DKDK_MANUEL — Le site envoie X-Frame-Options: DENY -> impossible d'afficher le manuel
// dans un cadre/iframe. On ouvre donc le document complet en pleine page (nouvel onglet)
// depuis la barre laterale. Cette page sert de secours si on arrive par l'URL directe.
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';

export default function AdminManuelPage() {
  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 460, textAlign: 'center', background: '#15151c', border: '1px solid #26262f', borderRadius: 16, padding: '32px 28px' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>\uD83D\uDCD8</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Manuel Admin Diki-Diki</h1>
            <p style={{ color: '#9a9183', fontSize: 14, margin: '0 0 20px' }}>Le guide des 19 menus (Dashboard &rarr; Monitoring) s&apos;ouvre dans un nouvel onglet.</p>
            <a href="/manuel-admin.html" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#FFAA00', color: '#120b00', fontWeight: 700, fontSize: 14, padding: '11px 20px', borderRadius: 10, textDecoration: 'none' }}>\uD83D\uDCD6 Ouvrir le manuel</a>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
