'use client';

import { useEffect, useState } from 'react';
import EchoIcon, { StatutEcho } from './EchoIcon';

// Carte « fidélité » autonome : interroge /gamification/me et ne rend RIEN si le
// module est inactif. Aucune logique d'argent — statut + solde + progression + badges + historique.
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token');
}

const SOURCE_LABEL: Record<string, string> = {
  vote: 'Votes', affiche: 'Affiches', parrainage: 'Parrainages', partage: 'Partages', commentaire: 'Commentaires',
};
function sourceLabel(action: string): string {
  return SOURCE_LABEL[action] || (action ? action.charAt(0).toUpperCase() + action.slice(1) : 'Autre');
}

interface Source { action: string; echos: number; n: number; }
interface Progression {
  saison: string; defi: number;
  mois: { payant: number; gratuit: number; total: number; valide: boolean; manque: number; plafondGratuit: number };
  moisValidesSaison: number; lettre: string;
}
interface Me {
  actif: boolean;
  echos?: number;
  statut?: { code: string; nom: string };
  badges?: { code: string; nom: string; icone: string }[];
  sources?: Source[];
  progression?: Progression | null;
}

const OR = 'var(--or, #FFAA00)';
const INK = 'var(--ink, #e8e0d0)';
const LINE = 'var(--line, #26262f)';

export default function EchosStatutCard() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    fetch(`${API}/gamification/me`, { headers: { Authorization: 'Bearer ' + t } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.data ?? null))
      .catch(() => {});
  }, []);

  if (!me || !me.actif) return null;

  const statut = (me.statut?.code || 'messager') as StatutEcho;
  const badges = me.badges ?? [];
  const sources = (me.sources ?? []).filter((s) => s.echos > 0);
  const p = me.progression;
  const pct = p ? Math.min(100, Math.round((p.mois.total / Math.max(1, p.defi)) * 100)) : 0;

  return (
    <div
      style={{
        background: 'var(--surface, #15151c)', border: `1px solid ${LINE}`, borderRadius: 16,
        padding: '18px 20px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}
    >
      <EchoIcon statut={statut} size={44} title={me.statut?.nom} />
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 12, letterSpacing: 0.5, opacity: 0.7, color: INK }}>MON STATUT</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>{me.statut?.nom ?? 'Le Messager'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: OR }}>{me.echos ?? 0}</div>
        <div style={{ fontSize: 12, opacity: 0.7, color: INK }}>Échos</div>
      </div>

      {/* PROGRESSION DU MOIS + SAISON */}
      {p && (
        <div style={{ width: '100%', paddingTop: 12, borderTop: `1px solid ${LINE}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 12, letterSpacing: 0.5, opacity: 0.7, color: INK }}>DÉFI DU MOIS</span>
            <span style={{ fontSize: 13.5, color: INK }}>
              <strong style={{ color: OR }}>{p.mois.total}</strong> / {p.defi} Échos
            </span>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: p.mois.valide ? 'linear-gradient(90deg,#1FB673,#4ade80)' : `linear-gradient(90deg,${OR},#FF6B00)`, transition: 'width .4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: INK }}>
              {p.mois.valide
                ? <span style={{ color: '#4ade80', fontWeight: 700 }}>✓ Mois validé</span>
                : <span>Il te manque <strong style={{ color: OR }}>{p.mois.manque}</strong> Écho{p.mois.manque > 1 ? 's' : ''} ce mois-ci</span>}
            </span>
            {/* Lettres C → B → A */}
            <span style={{ display: 'inline-flex', gap: 6 }}>
              {['C', 'B', 'A'].map((L, i) => {
                const ok = p.moisValidesSaison > i;
                return (
                  <span key={L} title={`Mois ${i + 1} de la saison`}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800,
                      background: ok ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.05)',
                      color: ok ? '#4ade80' : 'rgba(232,224,208,0.4)',
                      border: `1px solid ${ok ? 'rgba(74,222,128,0.5)' : LINE}`,
                    }}>{L}</span>
                );
              })}
            </span>
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.6, color: INK, marginTop: 6 }}>
            Saison {p.moisValidesSaison}/3 mois validés · 3 lettres (A) = montée de statut · coup de pouce gratuit ≤ {p.mois.plafondGratuit} Échos/mois
          </div>
        </div>
      )}

      {/* BADGES */}
      {badges.length > 0 && (
        <div style={{ width: '100%', display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 12, borderTop: `1px solid ${LINE}` }}>
          {badges.map((b) => (
            <span key={b.code} title={b.nom}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: INK, background: 'rgba(255,170,0,0.08)', border: `1px solid ${LINE}`, borderRadius: 999, padding: '4px 10px' }}>
              <span aria-hidden>{b.icone}</span>{b.nom}
            </span>
          ))}
        </div>
      )}

      {/* HISTORIQUE PAR SOURCE */}
      {sources.length > 0 && (
        <div style={{ width: '100%', paddingTop: 12, borderTop: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 12, letterSpacing: 0.5, opacity: 0.7, color: INK, marginBottom: 8 }}>D'OÙ VIENNENT MES ÉCHOS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sources.map((s) => (
              <div key={s.action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13.5, color: INK }}>
                <span style={{ opacity: 0.85 }}>{sourceLabel(s.action)}<span style={{ opacity: 0.5, fontSize: 12 }}> · {s.n}</span></span>
                <span style={{ fontWeight: 700, color: OR }}>+{s.echos}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
