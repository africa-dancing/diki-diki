'use client';

import { useEffect, useState } from 'react';
import EchoIcon, { StatutEcho } from './EchoIcon';

// Carte « fidélité » autonome : interroge /gamification/me et ne rend RIEN si le
// module est inactif. Aucune logique d'argent — statut + solde d'Échos + badges.
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token');
}

interface Me {
  actif: boolean;
  echos?: number;
  statut?: { code: string; nom: string };
  badges?: { code: string; nom: string; icone: string }[];
}

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

  if (!me || !me.actif) return null; // module OFF -> invisible, zéro effet

  const statut = (me.statut?.code || 'messager') as StatutEcho;
  const badges = me.badges ?? [];

  return (
    <div
      style={{
        background: 'var(--surface, #15151c)',
        border: '1px solid var(--line, #26262f)',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <EchoIcon statut={statut} size={44} title={me.statut?.nom} />
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 12, letterSpacing: 0.5, opacity: 0.7, color: 'var(--ink, #e8e0d0)' }}>
          MON STATUT
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink, #e8e0d0)' }}>
          {me.statut?.nom ?? 'Le Messager'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--or, #FFAA00)' }}>
          {me.echos ?? 0}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, color: 'var(--ink, #e8e0d0)' }}>Échos</div>
      </div>
      {badges.length > 0 && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            paddingTop: 12,
            borderTop: '1px solid var(--line, #26262f)',
          }}
        >
          {badges.map((b) => (
            <span
              key={b.code}
              title={b.nom}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--ink, #e8e0d0)',
                background: 'rgba(255,170,0,0.08)',
                border: '1px solid var(--line, #26262f)',
                borderRadius: 999,
                padding: '4px 10px',
              }}
            >
              <span aria-hidden>{b.icone}</span>
              {b.nom}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
