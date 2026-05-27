'use client';
import { useState } from 'react';

const ADS = [
  { id:'a1', emoji:'🎪', cat:'Événements', tag:'🎪 ÉVÉNEMENT · ABIDJAN',    bg:'linear-gradient(135deg,#1a0800,#2A1200)', title:'Grande Finale PAC — Saison 1',       desc:'Assistez en direct à la grande finale à Abidjan. 500 places disponibles. Entrée gratuite sur inscription.', date:'📅 15 juin 2026 · 20h00 · Palais de la Culture', cta:'S\'inscrire',   ctaStyle:'primary', toast:'📩 Inscription enregistrée !' },
  { id:'a2', emoji:'🎤', cat:'Auditions',  tag:'🎤 AUDITION · COTONOU',      bg:'linear-gradient(135deg,#0a1800,#102800)', title:'Auditions PAC Saison 2 — Bénin',      desc:'Tu chantes, danses ou fais rire ? Inscris-toi aux auditions à Cotonou. Toutes disciplines acceptées.', date:'📅 20 juin 2026 · Centre Culturel',              cta:'Candidater',   ctaStyle:'primary', toast:'📩 Candidature envoyée !'   },
  { id:'a3', emoji:'📺', cat:'Médias',     tag:'📺 MÉDIA · RTI 2',           bg:'linear-gradient(135deg,#001818,#002828)', title:'PAC sur RTI 2 — Diffusion officielle', desc:'Diki-Diki diffusé tous les samedis à 20h sur RTI 2 en Côte d\'Ivoire.',               date:'📅 Chaque samedi · 20h00',                       cta:'🔔 Rappel',    ctaStyle:'outline', toast:'🔔 Rappel activé !'         },
  { id:'a4', emoji:'🎵', cat:'Partenariats',tag:'🎵 PARTENARIAT · DAKAR',    bg:'linear-gradient(135deg,#18001a,#280028)', title:'PAC × Dakar Music Festival 2026',      desc:'Les candidats PAC se produisent sur la grande scène du Dakar Music Festival. Venez les soutenir !', date:'📅 28 juin 2026 · Dakar Arena',                  cta:'En savoir +',  ctaStyle:'primary', toast:'ℹ️ Infos envoyées !'        },
  { id:'a5', emoji:'🏟️', cat:'Événements', tag:'🏟️ ÉVÉNEMENT · COTONOU',    bg:'linear-gradient(135deg,#001828,#002040)', title:'PAC Live — Tour Bénin 2026',           desc:'PAC débarque au Bénin ! Retrouvez vos candidats préférés en concert à Cotonou, Porto-Novo et Parakou.', date:'📅 Juillet 2026 · 3 villes',                  cta:'Réserver',     ctaStyle:'primary', toast:'📩 Réservation enregistrée !'},
  { id:'a6', emoji:'📻', cat:'Médias',     tag:'📻 RADIO · SÉNÉGAL',         bg:'linear-gradient(135deg,#1a1000,#2A1800)', title:'PAC sur RFM Sénégal',                  desc:'Retrouvez les meilleurs moments de PAC chaque vendredi à 18h sur RFM Sénégal.', date:'📅 Chaque vendredi · 18h00',                       cta:'🔔 Rappel',    ctaStyle:'outline', toast:'🔔 Rappel activé !'         },
];

const CATS = ['Tout','🎪 Événements','🎤 Auditions','📺 Médias','🤝 Partenariats'];

export default function PublicitesPage() {
  const [cat,   setCat]   = useState('Tout');
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const filtered = ADS.filter(a =>
    cat === 'Tout' || a.cat === cat.replace(/^.+\s/, '')
  );

  return (
    <div style={{ background:'#1a1a1a', minHeight:'100vh', paddingBottom:'1rem' }}>

      {/* Filtres */}
      <div style={{ display:'flex', gap:'6px', padding:'.65rem 1rem .4rem', overflowX:'auto' }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding:'4px 12px', borderRadius:'16px', fontSize:'11px', fontWeight:500,
            whiteSpace:'nowrap', cursor:'pointer', fontFamily:'inherit', flexShrink:0,
            background: cat===c ? '#F5A623' : '#222',
            border: cat===c ? 'none' : '0.5px solid #3A3A3A',
            color: cat===c ? '#000' : '#9A9080',
          }}>{c}</button>
        ))}
      </div>

      <div style={{ padding:'.5rem 1rem .2rem', fontSize:'11px', fontWeight:500, color:'#9A9080' }}>
        📌 À la une
      </div>

      {filtered.map(a => (
        <div key={a.id} style={{ margin:'.45rem 1rem', background:'#222',
          border:'0.5px solid #2A2A2A', borderRadius:'12px', overflow:'hidden' }}>

          {/* Bannière */}
          <div style={{ width:'100%', height:'100px', background:a.bg,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'40px', position:'relative' }}>
            {a.emoji}
            <div style={{ position:'absolute', top:'8px', left:'10px' }}>
              <span style={{ fontSize:'9px', fontWeight:500, padding:'2px 8px',
                borderRadius:'12px', background:'rgba(0,0,0,.65)',
                color:'#F5A623', border:'0.5px solid #F5A623' }}>{a.tag}</span>
            </div>
          </div>

          {/* Contenu */}
          <div style={{ padding:'.75rem 1rem' }}>
            <div style={{ fontSize:'13px', fontWeight:500, color:'#F0ECE4', marginBottom:'4px' }}>
              {a.title}
            </div>
            <div style={{ fontSize:'11px', color:'#5A5040', lineHeight:1.5, marginBottom:'.65rem' }}>
              {a.desc}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:'10px', color:'#3A3A3A' }}>{a.date}</div>
              <button onClick={() => showToast(a.toast)} style={{
                border:'none', borderRadius:'7px', padding:'6px 14px',
                fontSize:'11px', fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                background: a.ctaStyle === 'primary' ? '#F5A623' : 'none',
                color: a.ctaStyle === 'primary' ? '#000' : '#1D9E75',
                ...(a.ctaStyle === 'outline' ? { border:'0.5px solid #1D9E75' } : {}),
              }}>{a.cta}</button>
            </div>
          </div>
        </div>
      ))}

      {toast && (
        <div style={{ position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
          background:'#1D9E75', color:'#fff', padding:'8px 18px', borderRadius:'18px',
          fontSize:'12px', fontWeight:500, zIndex:9999, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

