'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';

interface Reglage { key: string; value: string; description: string; }

const GROUPES: { titre: string; cles: string[] }[] = [
  { titre: '💰 Votes & cagnotte', cles: ['bracket_vote_amount', 'bracket_heart_amount', 'soutenir_amount', 'recharge_unit_value'] },
  { titre: '🏆 Répartition C12 / C16 (3 lauréats)', cles: ['bracket_commission_pct', 'bracket_champion_pct', 'bracket_second_pct', 'bracket_troisieme_pct'] },
  { titre: '🥈 Répartition C8 (2 lauréats)', cles: ['bracket_c8_champion_pct', 'bracket_c8_second_pct'] },
  { titre: '🎯 Objectifs par étape', cles: ['bracket_obj_huitieme', 'bracket_obj_quart', 'bracket_obj_demi', 'bracket_obj_finale'] },
  { titre: '⏱️ Délais', cles: ['bracket_egalite_jours', 'bracket_soumission_jours', 'bracket_relance_jours'] },
  { titre: '\u{1F3B5} Musique d ambiance', cles: ['ambiance_audio_url', 'ambiance_active', 'ambiance_pages_exclues'] },
];

export default function AdminReglagesPage() {
  const { admin } = useAdminAuth();
  const [reglages, setReglages] = useState<Reglage[]>([]);
  const [valeurs, setValeurs]   = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [busyKey, setBusyKey]   = useState<string | null>(null);
  const [info, setInfo]         = useState('');

  const charger = () => {
    setLoading(true);
    fetch(`${API}/settings`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list: Reglage[] = d?.data ?? [];
        setReglages(list);
        const v: Record<string, string> = {};
        list.forEach(r => { v[r.key] = r.value; });
        setValeurs(v);
      })
      .catch(() => setInfo('Erreur de chargement.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const enregistrer = async (key: string) => {
    setBusyKey(key); setInfo('');
    try {
      const r = await fetch(`${API}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
        body: JSON.stringify({ key, value: valeurs[key] }),
      });
      if (!r.ok) throw new Error();
      setInfo('✓ Réglage enregistré : ' + key);
    } catch {
      setInfo('✗ Erreur lors de l enregistrement de ' + key);
    } finally {
      setBusyKey(null);
    }
  };

  const trouver = (key: string) => reglages.find(r => r.key === key);

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 800 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: OR, margin: '0 0 6px' }}>
            Réglages du Challenge
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
            Modifiez les paramètres du Challenge par élimination directe sans toucher au code.
          </p>

          {info && <p style={{ fontSize: 13, color: info.startsWith('✓') ? '#4ade80' : '#f87171', fontWeight: 600, marginBottom: 16 }}>{info}</p>}
          {loading && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Chargement…</p>}

          {!loading && GROUPES.map(groupe => (
            <div key={groupe.titre} style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff', margin: '0 0 12px' }}>
                {groupe.titre}
              </h2>
              {groupe.cles.map(key => {
                const r = trouver(key);
                if (!r) return null;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '12px 14px', background: '#15151c', borderRadius: 10, border: '1px solid rgba(255,170,0,0.12)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#e8e0d0', marginBottom: 2 }}>{r.description}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{key}</div>
                    </div>
                    <input
                      value={valeurs[key] ?? ''}
                      onChange={e => setValeurs({ ...valeurs, [key]: e.target.value })}
                      style={{ width: 120, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,170,0,0.25)', background: '#0a0a0f', color: '#fff', fontSize: 14, textAlign: 'right' }}
                    />
                    <button
                      onClick={() => enregistrer(key)}
                      disabled={busyKey === key}
                      style={{ background: OR, color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: busyKey === key ? 'default' : 'pointer', opacity: busyKey === key ? 0.6 : 1, whiteSpace: 'nowrap' }}
                    >
                      Enregistrer
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}