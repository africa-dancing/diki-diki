/* DKDK_MON_LIEN_VOTE — Bloc « Mes liens de vote personnels » dans l'espace candidat.
   Appelle GET /v1/vote-link/mine (authentifié) et affiche, pour chaque participation,
   le lien diki-diki.com/v/<code> avec bouton copier, partage, et un QR code
   (généré au runtime via qrcodejs chargé depuis cdnjs ; si le script ne charge pas,
   le lien et la copie fonctionnent quand même). Lecture seule, aucune donnée sensible. */
'use client';
import { useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

type Lien = { participant_id: string; code: string | null; bracket_id: string;
  bracket_title: string | null; status: string | null; eliminated: boolean };

function getToken(): string | null {
  try { return localStorage.getItem('dkdk_token'); } catch { return null; }
}

// QR autonome : rend dans un div dès que window.QRCode est disponible.
function QrBox({ text, size = 128 }: { text: string; size?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let stop = false; let tries = 0;
    const render = () => {
      if (stop || !ref.current) return;
      const QR = (window as any).QRCode;
      if (QR) {
        try {
          ref.current.innerHTML = '';
          // eslint-disable-next-line new-cap
          new QR(ref.current, { text, width: size, height: size, correctLevel: QR.CorrectLevel ? QR.CorrectLevel.M : undefined });
          setOk(true);
        } catch { setOk(false); }
        return;
      }
      if (tries++ > 70) { setOk(false); return; }
      setTimeout(render, 100);
    };
    render();
    return () => { stop = true; };
  }, [text, size]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div ref={ref} style={{ width: size, height: size, background: '#fff', borderRadius: 10, padding: 8, boxSizing: 'content-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      {ok === false && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>QR momentanément indisponible</div>}
    </div>
  );
}

export default function MonLienVote() {
  const [liens, setLiens] = useState<Lien[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Charge qrcodejs une seule fois (runtime, cdnjs). Sans build-dépendance.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).QRCode) return;
    if (document.getElementById('dkdk-qrcodejs')) return;
    const s = document.createElement('script');
    s.id = 'dkdk-qrcodejs';
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    fetch(API + '/vote-link/mine', { headers: { Authorization: 'Bearer ' + token } })
      .then((r) => r.json())
      .then((j: any) => { if (j && j.success) setLiens((j.data || []).filter((l: Lien) => l.code)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.diki-diki.com';
  const urlOf = (code: string) => origin + '/v/' + code;

  const copier = async (code: string) => {
    try { await navigator.clipboard.writeText(urlOf(code)); setCopied(code); setTimeout(() => setCopied(null), 2500); } catch {}
  };
  const partager = async (code: string, titre: string | null) => {
    const url = urlOf(code);
    const txt = 'Soutiens-moi sur Diki-Diki' + (titre ? ' — ' + titre : '') + ' : un vote et tu me fais monter dans l’Arène !';
    try {
      if ((navigator as any).share) { await (navigator as any).share({ title: 'Diki-Diki', text: txt, url }); return; }
    } catch { /* annulé */ }
    copier(code);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>⏳ Chargement de tes liens…</div>;
  if (liens.length === 0) return null; // visiteur non-candidat : on n'affiche rien

  const ouvert = (s: string | null) => s === 'active' || s === 'in_progress';

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#fff', marginBottom: 4 }}>🔗 Mes liens de vote</div>
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 14 }}>
        Partage ton lien (ou ton QR) sur TikTok, WhatsApp, tes lives… Tes fans votent en 2 clics, sans créer de compte. Chaque vote te fait monter.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {liens.map((l) => {
          const code = l.code as string;
          const url = urlOf(code);
          return (
            <div key={l.participant_id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{l.bracket_title || 'Challenge'}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                  background: l.eliminated ? 'rgba(255,255,255,0.08)' : ouvert(l.status) ? 'rgba(31,182,115,0.16)' : 'rgba(255,170,0,0.14)',
                  color: l.eliminated ? 'rgba(255,255,255,0.5)' : ouvert(l.status) ? '#1FB673' : '#FFAA00' }}>
                  {l.eliminated ? 'Terminé' : ouvert(l.status) ? 'En cours' : 'Bientôt'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <QrBox text={url} size={120} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', wordBreak: 'break-all', fontFamily: 'monospace' }}>{url}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => copier(code)} style={{ flex: 1, minWidth: 110, background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', border: 'none', borderRadius: 50, padding: '10px 16px', fontWeight: 800, fontSize: 13, color: '#140a02', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                      {copied === code ? 'Copié ✓' : 'Copier le lien'}
                    </button>
                    <button onClick={() => partager(code, l.bracket_title)} style={{ flex: 1, minWidth: 110, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '10px 16px', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                      Partager
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
