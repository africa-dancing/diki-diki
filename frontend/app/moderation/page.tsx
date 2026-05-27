'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────
interface VideoToReview {
  id:           string;
  discipline:   string;
  track_title?: string;
  track_artist?:string;
  storage_url:  string;
  thumbnail_url?:string;
  file_size_mb: number;
  duration_sec: number;
  format:       string;
  status:       'pending' | 'approved' | 'rejected';
  created_at:   string;
  users: {
    id:           string;
    first_name:   string;
    last_name:    string;
    phone:        string;
    country_name: string;
  };
}

type Decision = 'approved' | 'rejected';

const REJECTION_REASONS = [
  'Contenu non conforme aux CGU',
  'Discipline incorrectement renseignée',
  'Qualité vidéo insuffisante (< 480p)',
  'Durée dépassée (> 3 minutes)',
  'Visage du participant non visible',
  'Contenu violent ou offensant',
  'Vidéo floue ou mal cadrée',
  'Son inaudible ou absent',
  'Autre (préciser)',
];

const DISC_EMOJI: Record<string, string> = {
  danse:'💃', chant:'🎤', instrument:'🎸',
  acapella:'🎙️', humour:'😂', poesie:'📜',
};

// ── Composant : carte d'une vidéo à modérer ───────────────
function VideoReviewCard({
  video,
  onDecision,
}: {
  video:      VideoToReview;
  onDecision: (id: string, decision: Decision, reason?: string) => Promise<void>;
}) {
  const [expanded,       setExpanded]       = useState(false);
  const [rejReason,      setRejReason]      = useState(REJECTION_REASONS[0]);
  const [customReason,   setCustomReason]   = useState('');
  const [confirming,     setConfirming]     = useState<Decision | null>(null);
  const [submitting,     setSubmitting]     = useState(false);

  const waitSince = Math.round(
    (Date.now() - new Date(video.created_at).getTime()) / (1000 * 60 * 60)
  );

  async function handleDecision(decision: Decision) {
    if (decision === 'rejected' && !confirming) {
      setConfirming('rejected');
      return;
    }
    setSubmitting(true);
    const reason = decision === 'rejected'
      ? (rejReason === 'Autre (préciser)' ? customReason : rejReason)
      : undefined;
    try {
      await onDecision(video.id, decision, reason);
    } finally {
      setSubmitting(false);
      setConfirming(null);
    }
  }

  return (
    <div style={{
      background:   'var(--color-background-primary)',
      border:       '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow:     'hidden',
      marginBottom: '.75rem',
    }}>
      {/* En-tête candidat */}
      <div style={{
        display:'flex', alignItems:'center', gap:'12px',
        padding:'.85rem 1rem',
        borderBottom:'0.5px solid var(--color-border-tertiary)',
      }}>
        {/* Avatar initiales */}
        <div style={{
          width:'38px', height:'38px', borderRadius:'50%', flexShrink:0,
          background:'var(--color-background-info)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'13px', fontWeight:500, color:'var(--color-text-info)',
        }}>
          {video.users.first_name[0]}{video.users.last_name[0]}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'13px', fontWeight:500,
            color:'var(--color-text-primary)', marginBottom:'2px' }}>
            {video.users.first_name} {video.users.last_name}
          </div>
          <div style={{ fontSize:'11px', color:'var(--color-text-tertiary)' }}>
            {video.users.phone} · {video.users.country_name}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{
            fontSize:'10px', fontWeight:500, padding:'2px 8px',
            borderRadius:'20px', marginBottom:'4px',
            background:'var(--color-background-warning)',
            color:'var(--color-text-warning)',
          }}>
            En attente
          </div>
          <div style={{ fontSize:'10px', color:'var(--color-text-tertiary)' }}>
            {waitSince < 1 ? 'À l\'instant' : `Il y a ${waitSince}h`}
          </div>
        </div>
      </div>

      {/* Infos prestation */}
      <div style={{
        display:'grid', gridTemplateColumns:'auto 1fr',
        gap:'0', borderBottom:'0.5px solid var(--color-border-tertiary)',
      }}>
        {/* Miniature vidéo */}
        <div style={{
          width:'140px', flexShrink:0,
          background:'var(--color-background-secondary)',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', cursor:'pointer',
          borderRight:'0.5px solid var(--color-border-tertiary)',
        }}
          onClick={() => setExpanded(!expanded)}>
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="Miniature"
              style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ fontSize:'32px' }}>
              {DISC_EMOJI[video.discipline] || '🎬'}
            </div>
          )}
          <div style={{
            position:'absolute', bottom:'6px', right:'6px',
            background:'rgba(0,0,0,.6)', color:'#fff',
            fontSize:'9px', padding:'2px 5px', borderRadius:'4px',
          }}>
            {Math.floor(video.duration_sec / 60)}:{String(video.duration_sec % 60).padStart(2,'0')}
          </div>
          <div style={{
            position:'absolute', top:'6px', left:'6px', fontSize:'14px',
          }}>
            {DISC_EMOJI[video.discipline]}
          </div>
        </div>

        {/* Détails */}
        <div style={{ padding:'.85rem 1rem' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {[
              { l:'Discipline', v:`${DISC_EMOJI[video.discipline]} ${video.discipline}` },
              { l:'Morceau',    v: video.track_title || '—' },
              { l:'Artiste',    v: video.track_artist || '—' },
              { l:'Taille',     v: `${video.file_size_mb?.toFixed(1)} MB · ${video.format?.toUpperCase()}` },
              { l:'Durée',      v: `${Math.floor(video.duration_sec/60)}m${video.duration_sec%60}s` },
            ].map(row => (
              <div key={row.l} style={{
                display:'flex', gap:'8px', fontSize:'12px',
              }}>
                <span style={{ color:'var(--color-text-tertiary)', width:'80px',
                  flexShrink:0 }}>{row.l}</span>
                <span style={{ color:'var(--color-text-primary)',
                  fontWeight:500 }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lecteur vidéo (expandable) */}
      {expanded && (
        <div style={{ borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
          <video
            src={video.storage_url}
            controls
            style={{ width:'100%', maxHeight:'280px', background:'#000', display:'block' }}
          />
        </div>
      )}

      {/* Zone de décision */}
      <div style={{ padding:'.85rem 1rem' }}>

        {/* Motif de rejet (visible si on veut rejeter) */}
        {confirming === 'rejected' && (
          <div style={{ marginBottom:'.75rem' }}>
            <div style={{ fontSize:'11px', fontWeight:500,
              color:'var(--color-text-secondary)', marginBottom:'6px' }}>
              Motif du refus
            </div>
            <select value={rejReason}
              onChange={e => setRejReason(e.target.value)}
              style={{ width:'100%', marginBottom:'6px', fontSize:'12px',
                fontFamily:'var(--font-sans)' }}>
              {REJECTION_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {rejReason === 'Autre (préciser)' && (
              <input
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Précisez le motif..."
                style={{ width:'100%', fontSize:'12px', fontFamily:'var(--font-sans)' }}
              />
            )}
          </div>
        )}

        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {/* Bouton visionner */}
          <button onClick={() => setExpanded(!expanded)}
            style={{
              padding:'7px 14px', fontSize:'12px', fontWeight:500,
              borderRadius:'var(--border-radius-md)', cursor:'pointer',
              fontFamily:'var(--font-sans)',
              background:'var(--color-background-secondary)',
              border:'0.5px solid var(--color-border-secondary)',
              color:'var(--color-text-secondary)',
            }}>
            {expanded ? 'Fermer' : 'Visionner'}
          </button>

          {/* Bouton Valider */}
          {confirming !== 'rejected' && (
            <button onClick={() => handleDecision('approved')}
              disabled={submitting}
              style={{
                flex:1, padding:'7px 14px', fontSize:'12px', fontWeight:500,
                borderRadius:'var(--border-radius-md)', cursor:'pointer',
                fontFamily:'var(--font-sans)',
                background:'var(--color-background-success)',
                border:'0.5px solid var(--color-border-success)',
                color:'var(--color-text-success)',
                opacity: submitting ? .6 : 1,
              }}>
              {submitting ? 'En cours...' : '✓ Valider'}
            </button>
          )}

          {/* Bouton Refuser / Confirmer le refus */}
          <button
            onClick={() => confirming === 'rejected'
              ? handleDecision('rejected')
              : setConfirming('rejected')}
            disabled={submitting}
            style={{
              flex:1, padding:'7px 14px', fontSize:'12px', fontWeight:500,
              borderRadius:'var(--border-radius-md)', cursor:'pointer',
              fontFamily:'var(--font-sans)',
              background: confirming === 'rejected'
                ? 'var(--color-background-danger)'
                : 'var(--color-background-primary)',
              border: confirming === 'rejected'
                ? '0.5px solid var(--color-border-danger)'
                : '0.5px solid var(--color-border-tertiary)',
              color: confirming === 'rejected'
                ? 'var(--color-text-danger)'
                : 'var(--color-text-secondary)',
              opacity: submitting ? .6 : 1,
            }}>
            {confirming === 'rejected' ? 'Confirmer le refus' : '✕ Refuser'}
          </button>

          {/* Annuler le refus */}
          {confirming === 'rejected' && (
            <button onClick={() => setConfirming(null)}
              style={{
                padding:'7px 12px', fontSize:'12px',
                borderRadius:'var(--border-radius-md)', cursor:'pointer',
                fontFamily:'var(--font-sans)', background:'none',
                border:'0.5px solid var(--color-border-tertiary)',
                color:'var(--color-text-tertiary)',
              }}>
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page principale modération ────────────────────────────
export default function ModerationPage() {
  const [videos,   setVideos]   = useState<VideoToReview[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [done,     setDone]     = useState<{ id:string; decision:Decision }[]>([]);
  const [filter,   setFilter]   = useState<'all'|'danse'|'chant'|'instrument'|'acapella'|'humour'|'poesie'>('all');
  const [toast,    setToast]    = useState('');

  useEffect(() => { loadVideos(); }, []);

  async function loadVideos() {
    setLoading(true);
    try {
      const { videos } = await api.videos.pending();
      setVideos(videos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(
    videoId:  string,
    decision: Decision,
    reason?:  string
  ) {
    await api.videos.moderate(videoId, decision, reason);
    setVideos(prev => prev.filter(v => v.id !== videoId));
    setDone(prev => [...prev, { id: videoId, decision }]);
    showToast(decision === 'approved'
      ? 'Vidéo validée — candidat notifié.'
      : 'Vidéo refusée — candidat notifié avec le motif.');
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const filtered = filter === 'all'
    ? videos
    : videos.filter(v => v.discipline === filter);

  const approved = done.filter(d => d.decision === 'approved').length;
  const rejected = done.filter(d => d.decision === 'rejected').length;

  return (
    <main style={{ maxWidth:'680px', margin:'0 auto', padding:'1.5rem 1rem' }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)',
        gap:'8px', marginBottom:'1.25rem' }}>
        {[
          { l:'En attente', v: videos.length, bg:'var(--color-background-warning)',
            c:'var(--color-text-warning)' },
          { l:'Validées', v: approved, bg:'var(--color-background-success)',
            c:'var(--color-text-success)' },
          { l:'Refusées', v: rejected, bg:'var(--color-background-danger)',
            c:'var(--color-text-danger)' },
        ].map(k => (
          <div key={k.l} style={{
            background:k.bg, borderRadius:'var(--border-radius-md)',
            padding:'.85rem', textAlign:'center',
          }}>
            <div style={{ fontSize:'24px', fontWeight:500, color:k.c }}>
              {k.v}
            </div>
            <div style={{ fontSize:'11px', color:k.c, marginTop:'2px' }}>
              {k.l}
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          padding:'9px 14px', borderRadius:'var(--border-radius-md)',
          background:'var(--color-background-success)',
          border:'0.5px solid var(--color-border-success)',
          color:'var(--color-text-success)',
          fontSize:'12px', marginBottom:'.75rem',
        }}>
          {toast}
        </div>
      )}

      {/* Filtre disciplines */}
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'1rem' }}>
        {(['all','danse','chant','instrument','acapella','humour','poesie'] as const).map(d => (
          <button key={d} onClick={() => setFilter(d)}
            style={{
              padding:'3px 10px', fontSize:'11px', fontWeight:500,
              borderRadius:'20px', cursor:'pointer', fontFamily:'var(--font-sans)',
              background: filter===d ? 'var(--color-background-info)' : 'var(--color-background-primary)',
              border: filter===d ? '0.5px solid var(--color-border-info)' : '0.5px solid var(--color-border-tertiary)',
              color: filter===d ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
            }}>
            {d==='all' ? 'Toutes' : `${DISC_EMOJI[d]} ${d}`}
          </button>
        ))}
        <button onClick={loadVideos}
          style={{
            marginLeft:'auto', padding:'3px 10px', fontSize:'11px',
            borderRadius:'20px', cursor:'pointer', fontFamily:'var(--font-sans)',
            background:'var(--color-background-secondary)',
            border:'0.5px solid var(--color-border-secondary)',
            color:'var(--color-text-secondary)',
          }}>
          Actualiser
        </button>
      </div>

      {/* Liste des vidéos */}
      {loading ? (
        <div style={{ padding:'2rem', textAlign:'center',
          color:'var(--color-text-tertiary)', fontSize:'13px' }}>
          Chargement de la file de modération...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding:'2rem', textAlign:'center',
          background:'var(--color-background-secondary)',
          borderRadius:'var(--border-radius-lg)',
          color:'var(--color-text-tertiary)', fontSize:'13px',
        }}>
          {videos.length === 0
            ? 'Aucune vidéo en attente — file vide.'
            : 'Aucune vidéo dans cette discipline.'}
        </div>
      ) : (
        filtered.map(video => (
          <VideoReviewCard
            key={video.id}
            video={video}
            onDecision={handleDecision}
          />
        ))
      )}
    </main>
  );
}

