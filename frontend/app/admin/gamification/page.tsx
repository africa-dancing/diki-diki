'use client';
// frontend/app/admin/gamification/page.tsx
// DKDK_GAMIFICATION — Réglages Gamification (« Les Échos ») — PHASE 1 (Fondations).
// Interrupteur maître INACTIF par défaut : tant qu'il est OFF, aucun Écho n'est attribué
// et l'Agent Engagement reste muet. AUCUNE logique d'argent ici.
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

interface GamifSettings {
  module_actif: boolean;
  echo_par_vote: number;
  echo_parrainage: number;
  echo_partage: number;
  echo_commentaire: number;
  plafond_coup_pouce_pct: number;
  fuseau: string;
  updated_at?: string;
}

const DEFAULTS: GamifSettings = {
  module_actif: false, echo_par_vote: 1, echo_parrainage: 3, echo_partage: 2,
  echo_commentaire: 1, plafond_coup_pouce_pct: 20, fuseau: 'WAT',
};

export default function AdminGamificationPage() {
  const { admin } = useAdminAuth();
  const [s, setS]         = useState<GamifSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [info, setInfo]       = useState('');
  const [err, setErr]         = useState('');

  const charger = () => {
    if (!admin?.token) return;
    setLoading(true); setInfo(''); setErr('');
    fetch(`${API}/gamification/settings`, { cache: 'no-store', headers: { Authorization: `Bearer ${admin.token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setS({ ...DEFAULTS, ...d.data }); })
      .catch(() => setErr('Erreur de chargement.'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [admin?.token]);

  const sauver = (patch: Partial<GamifSettings>) => {
    if (!admin?.token) return;
    setSaving(true); setInfo(''); setErr('');
    fetch(`${API}/gamification/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify(patch),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success && d.data) { setS({ ...DEFAULTS, ...d.data }); setInfo('✅ Enregistré.'); } else setErr('Échec de l’enregistrement.'); })
      .catch(() => setErr('Erreur réseau.'))
      .finally(() => setSaving(false));
  };

  const num = (label: string, key: keyof GamifSettings, aide?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div><div style={{ fontSize: 14 }}>{label}</div>{aide && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{aide}</div>}</div>
      <input type="number" value={Number(s[key] as number)} onChange={e => setS({ ...s, [key]: parseInt(e.target.value || '0', 10) })}
        style={{ width: 90, background: '#0f0f16', color: '#e8e0d0', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '7px 10px', fontSize: 14, textAlign: 'right' }} />
    </div>
  );

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 760 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: OR, margin: '0 0 4px' }}>🎖️ Fidélité — Les Échos</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>
            Réglages du programme de fidélité des votants (Phase 1 — Fondations). Les « Échos » ne sont <b>ni argent ni vote</b>.
            Tant que l'<b>interrupteur maître</b> est sur <b>OFF</b>, aucun Écho n'est attribué et le programme reste totalement invisible.
          </p>

          {err && <div style={{ color: '#ff8a8a', fontSize: 13, marginBottom: 12 }}>{err}</div>}
          {info && <div style={{ color: '#5bd98a', fontSize: 13, marginBottom: 12 }}>{info}</div>}

          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.5)' }}>Chargement…</div>
          ) : (
            <>
              {/* Interrupteur maître */}
              <div style={{ padding: '18px 20px', borderRadius: 14, border: `1px solid ${s.module_actif ? 'rgba(91,217,138,0.5)' : 'rgba(255,170,0,0.35)'}`, background: s.module_actif ? 'rgba(91,217,138,0.08)' : 'rgba(255,170,0,0.06)', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>Interrupteur maître</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                      {s.module_actif ? '🟢 Programme ACTIF — les votes payants rapportent des Échos.' : '⚪ Programme INACTIF — rien n’est attribué, rien n’est visible (recommandé avant les Phases 2-3).'}
                    </div>
                  </div>
                  <button onClick={() => sauver({ module_actif: !s.module_actif })} disabled={saving}
                    style={{ background: s.module_actif ? '#5bd98a' : 'rgba(255,255,255,0.12)', color: s.module_actif ? '#07210f' : '#e8e0d0', border: 'none', borderRadius: 50, padding: '10px 20px', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                    {s.module_actif ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </div>

              {/* Barème des Échos */}
              <div style={{ padding: '6px 20px 14px', borderRadius: 14, background: '#15151c', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 style={{ fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase', color: OR, margin: '14px 0 4px' }}>Barème des Échos</h2>
                {num('Vote payant', 'echo_par_vote', 'Échos par unité payée (étoile = 1, cœur = 2). Défaut 1.')}
                {num('Parrainage (filleul inscrit ET votant)', 'echo_parrainage', 'Compte uniquement dans la limite du coup de pouce gratuit.')}
                {num('Partage vérifié', 'echo_partage')}
                {num('Commentaire vérifié', 'echo_commentaire')}
                {num('Plafond coup de pouce gratuit (%)', 'plafond_coup_pouce_pct', 'Part max du défi mensuel remplie par les actions gratuites. 0 = tout en votes payants.')}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button onClick={() => sauver({ echo_par_vote: s.echo_par_vote, echo_parrainage: s.echo_parrainage, echo_partage: s.echo_partage, echo_commentaire: s.echo_commentaire, plafond_coup_pouce_pct: s.plafond_coup_pouce_pct })} disabled={saving}
                    style={{ background: OR, color: '#1a1200', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer' }}>
                    {saving ? '…' : 'Enregistrer le barème'}
                  </button>
                </div>
              </div>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
                Phase 1 (Fondations) : ledger des Échos + écoute des votes payants. Statuts, saisons/défis, classement (Phases 2-3) et Fonds Cadeaux / tirages (Phases 4-5, sous feu vert juridique) viendront ensuite. Source de vérité : <code>spec-module-gamification.md</code>.
              </p>
            </>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
