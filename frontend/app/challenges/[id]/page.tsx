'use client';
import LogoDikiDiki from '../../components/LogoDikiDiki';
import Navbar from '../../components/Navbar';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import TickerBand from '../../components/TickerBand';
import TranslateWidget from '../../components/TranslateWidget';

// ✅ Étoile rouge — identique au logo
const StarRed = () => <span style={{ color: '#FF0000' }}>★</span>;

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';
const OR2 = '#FF6B00';

function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

interface Candidate {
  id: string; name: string; stage_name?: string;
  photo_url?: string; track?: string; votes: number;
  video_id?: string;
}
interface Duel {
  id: string; round: number;
  candidateA: Candidate; candidateB: Candidate;
  winner_id?: string; status: 'pending'|'active'|'overtime'|'done';
  ends_at: string; votes_a: number; votes_b: number;
}
interface Bracket {
  id: string; title: string; discipline: string;
  type: 'libre'|'repertoire'; status: string;
  rounds: { round: number; label: string; days: number; duels: Duel[] }[];
  current_round: number; total_cagnotte: number;
  commission_pct: number; starts_at: string;
}

const ROUND_LABELS: Record<number, string> = {
  1:'Huitième de finale', 2:'Quart de finale',
  3:'Demi-finale', 4:'Finale'
};
const ROUND_DAYS: Record<number, number> = { 1:7, 2:7, 3:14, 4:7 };

const DEMO_BRACKET: Bracket = {
  id:'demo', title:'Battle Danse Afrobeats', discipline:'danse',
  type:'repertoire', status:'active', current_round:1,
  total_cagnotte:45000, commission_pct:50, starts_at: new Date().toISOString(),
  rounds: [
    {
      round:1, label:'Huitième de finale', days:7,
      duels: [
        { id:'d1', round:1, status:'active', ends_at: new Date(Date.now()+4*86400000).toISOString(), votes_a:234, votes_b:198, winner_id:undefined,
          candidateA:{ id:'a1', name:'Aminata K.', stage_name:'Queen Ama', track:'Afrobeats Medley', votes:234, video_id:'v1' },
          candidateB:{ id:'b1', name:'Kossi M.', stage_name:'MC Kossi', track:'Afrobeats Medley', votes:198, video_id:'v2' } },
        { id:'d2', round:1, status:'active', ends_at: new Date(Date.now()+4*86400000).toISOString(), votes_a:156, votes_b:156, winner_id:undefined,
          candidateA:{ id:'a2', name:'Fatou D.', stage_name:'DJ Fatou', track:'Coupé Décalé', votes:156, video_id:'v3' },
          candidateB:{ id:'b2', name:'Seydou B.', stage_name:'Sey Style', track:'Coupé Décalé', votes:156, video_id:'v4' } },
        { id:'d3', round:1, status:'done', ends_at: new Date(Date.now()-86400000).toISOString(), votes_a:312, votes_b:201, winner_id:'a3',
          candidateA:{ id:'a3', name:'Awa T.', stage_name:'Awa Fire', track:'Azonto Mix', votes:312, video_id:'v5' },
          candidateB:{ id:'b3', name:'Ibrahim S.', stage_name:'Ibra Move', track:'Azonto Mix', votes:201, video_id:'v6' } },
        { id:'d4', round:1, status:'done', ends_at: new Date(Date.now()-86400000).toISOString(), votes_a:178, votes_b:289, winner_id:'b4',
          candidateA:{ id:'a4', name:'Chloé N.', stage_name:'Chlo Dance', track:'Ndombolo', votes:178, video_id:'v7' },
          candidateB:{ id:'b4', name:'Moussa L.', stage_name:'Moussa King', track:'Ndombolo', votes:289, video_id:'v8' } },
      ]
    },
    {
      round:2, label:'Quart de finale', days:7,
      duels: [
        { id:'d5', round:2, status:'pending', ends_at:'', votes_a:0, votes_b:0, winner_id:undefined,
          candidateA:{ id:'a1', name:'Aminata K.', stage_name:'Queen Ama', track:'', votes:0 },
          candidateB:{ id:'a3', name:'Awa T.', stage_name:'Awa Fire', track:'', votes:0 } },
        { id:'d6', round:2, status:'pending', ends_at:'', votes_a:0, votes_b:0, winner_id:undefined,
          candidateA:{ id:'a2', name:'Fatou D.', stage_name:'DJ Fatou', track:'', votes:0 },
          candidateB:{ id:'b4', name:'Moussa L.', stage_name:'Moussa King', track:'', votes:0 } },
      ]
    },
    {
      round:3, label:'Demi-finale', days:14,
      duels: [
        { id:'d7', round:3, status:'pending', ends_at:'', votes_a:0, votes_b:0, winner_id:undefined,
          candidateA:{ id:'tbd1', name:'À déterminer', stage_name:'???', track:'', votes:0 },
          candidateB:{ id:'tbd2', name:'À déterminer', stage_name:'???', track:'', votes:0 } },
      ]
    },
    {
      round:4, label:'Finale', days:7,
      duels: [
        { id:'d8', round:4, status:'pending', ends_at:'', votes_a:0, votes_b:0, winner_id:undefined,
          candidateA:{ id:'fin1', name:'À déterminer', stage_name:'???', track:'', votes:0 },
          candidateB:{ id:'fin2', name:'À déterminer', stage_name:'???', track:'', votes:0 } },
      ]
    },
  ]
};

function Avatar({ c, size=40, winner, loser }: { c: Candidate; size?: number; winner?: boolean; loser?: boolean }) {
  const initials = (c.stage_name ?? c.name).split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const border = winner ? '2px solid #4ade80' : loser ? '2px solid #f87171' : `2px solid ${OR}`;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`linear-gradient(135deg,rgba(255,170,0,0.2),rgba(255,107,0,0.1))`, border, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:700, color:OR, fontFamily:'Syne,sans-serif', flexShrink:0, overflow:'hidden' }}>
      {c.photo_url ? <img src={c.photo_url} alt={c.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials}
    </div>
  );
}

function DuelCard({ duel, onVote, myVote }: { duel: Duel; onVote: (duelId:string, candidateId:string)=>void; myVote?: string }) {
  const router = useRouter();
  const totalVotes = duel.votes_a + duel.votes_b;
  const pctA = totalVotes > 0 ? Math.round((duel.votes_a / totalVotes)*100) : 50;
  const pctB = 100 - pctA;
  const isActive  = duel.status === 'active';
  const isOT      = duel.status === 'overtime';
  const isDone    = duel.status === 'done';
  const isPending = duel.status === 'pending';
  const winnerA   = isDone && duel.winner_id === duel.candidateA.id;
  const winnerB   = isDone && duel.winner_id === duel.candidateB.id;
  const isEqual   = isActive && duel.votes_a === duel.votes_b && totalVotes > 0;
  const daysLeft  = duel.ends_at ? Math.max(0, Math.ceil((new Date(duel.ends_at).getTime()-Date.now())/86400000)) : 0;

  const statusCfg = {
    active:   { label:'● En cours',     color:'#4ade80', bg:'rgba(74,222,128,0.1)'   },
    overtime: { label:'⏰ Prolongation', color:OR,        bg:'rgba(255,170,0,0.1)'    },
    done:     { label:'✓ Terminé',       color:'rgba(255,255,255,0.4)', bg:'rgba(255,255,255,0.05)' },
    pending:  { label:'⏳ À venir',      color:'rgba(255,255,255,0.3)', bg:'rgba(255,255,255,0.04)' },
  }[duel.status];

  return (
    <div style={{ background: isPending ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border:`1px solid ${isActive||isOT?'rgba(255,170,0,0.25)':'rgba(255,255,255,0.08)'}`, borderRadius:16, overflow:'hidden', marginBottom:12 }}>

      <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', background: isActive ? 'rgba(255,170,0,0.03)' : undefined }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {duel.candidateA.track && <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>🎵 {duel.candidateA.track}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isEqual && <span style={{ fontSize:10, color:OR, fontWeight:700, background:'rgba(255,170,0,0.1)', borderRadius:20, padding:'2px 8px' }}>⚖️ Égalité !</span>}
          <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:statusCfg.bg, color:statusCfg.color }}>{statusCfg.label}</span>
          
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        {isPending ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, padding:'12px 0' }}>
            <div style={{ textAlign:'center' as const, opacity:.4 }}>
              <Avatar c={duel.candidateA} size={44}/>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:6 }}>{duel.candidateA.stage_name}</div>
            </div>
            <div style={{ fontSize:18, color:'rgba(255,255,255,0.2)', fontWeight:800 }}>VS</div>
            <div style={{ textAlign:'center' as const, opacity:.4 }}>
              <Avatar c={duel.candidateB} size={44}/>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:6 }}>{duel.candidateB.stage_name}</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center', marginBottom:14 }}>
              {/* Candidat A */}
              <div style={{ display:'flex', flexDirection:'column' as const, alignItems:'center', gap:8 }}>
                <div style={{ position:'relative' as const }}>
                  <Avatar c={duel.candidateA} size={52} winner={winnerA} loser={isDone&&!winnerA}/>
                  {winnerA && <div style={{ position:'absolute' as const, top:-6, right:-6, fontSize:16 }}>🏆</div>}
                </div>
                <div style={{ textAlign:'center' as const }}>
                  <div style={{ fontSize:13, fontWeight:700, color: winnerA?'#4ade80':isDone&&!winnerA?'rgba(255,255,255,0.3)':'#fff' }}>{duel.candidateA.stage_name ?? duel.candidateA.name}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{duel.candidateA.name}</div>
                </div>
                <div style={{ fontSize:22, fontWeight:800, color: winnerA?'#4ade80':isDone&&!winnerA?'rgba(255,255,255,0.3)':OR, fontFamily:'Syne,sans-serif' }}>
                  {duel.votes_a.toLocaleString('fr-FR')}
                </div>
                {!isDone && !isPending && (
                  <button onClick={()=>{ if(duel.candidateA.video_id) router.push(`/watch/${duel.candidateA.video_id}`); }}
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'4px 10px', fontSize:10, color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>
                    ▶ Voir
                  </button>
                )}
              </div>

              {/* VS */}
              <div style={{ display:'flex', flexDirection:'column' as const, alignItems:'center', gap:6 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,170,0,0.1)', border:'1px solid rgba(255,170,0,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:OR }}>VS</div>
                {totalVotes > 0 && (
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', textAlign:'center' as const }}>{totalVotes.toLocaleString('fr-FR')}<br/>votes</div>
                )}
              </div>

              {/* Candidat B */}
              <div style={{ display:'flex', flexDirection:'column' as const, alignItems:'center', gap:8 }}>
                <div style={{ position:'relative' as const }}>
                  <Avatar c={duel.candidateB} size={52} winner={winnerB} loser={isDone&&!winnerB}/>
                  {winnerB && <div style={{ position:'absolute' as const, top:-6, right:-6, fontSize:16 }}>🏆</div>}
                </div>
                <div style={{ textAlign:'center' as const }}>
                  <div style={{ fontSize:13, fontWeight:700, color: winnerB?'#4ade80':isDone&&!winnerB?'rgba(255,255,255,0.3)':'#fff' }}>{duel.candidateB.stage_name ?? duel.candidateB.name}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{duel.candidateB.name}</div>
                </div>
                <div style={{ fontSize:22, fontWeight:800, color: winnerB?'#4ade80':isDone&&!winnerB?'rgba(255,255,255,0.3)':OR, fontFamily:'Syne,sans-serif' }}>
                  {duel.votes_b.toLocaleString('fr-FR')}
                </div>
                {!isDone && !isPending && (
                  <button onClick={()=>{ if(duel.candidateB.video_id) router.push(`/watch/${duel.candidateB.video_id}`); }}
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'4px 10px', fontSize:10, color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>
                    ▶ Voir
                  </button>
                )}
              </div>
            </div>

            {/* Barre de progression */}
            {totalVotes > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ height:6, borderRadius:3, overflow:'hidden', display:'flex' }}>
                  <div style={{ width:`${pctA}%`, background: winnerA?'#4ade80':'linear-gradient(90deg,#FFAA00,#FF6B00)', transition:'width .6s' }}/>
                  <div style={{ width:`${pctB}%`, background: winnerB?'#4ade80':'rgba(255,255,255,0.15)', transition:'width .6s' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:4 }}>
                  <span>{pctA}%</span><span>{pctB}%</span>
                </div>
              </div>
            )}

            {/* ✅ Boutons voter — ⭐ → <StarRed /> */}
            {(isActive || isOT) && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <button onClick={()=>onVote(duel.id, duel.candidateA.id)} disabled={!!myVote}
                  style={{ padding:'9px', borderRadius:10, border:'none', background: myVote===duel.candidateA.id?'rgba(74,222,128,0.15)':myVote?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#FFAA00,#FF6B00)', color: myVote===duel.candidateA.id?'#4ade80':myVote?'rgba(255,255,255,0.3)':'#000', fontSize:12, fontWeight:700, cursor:myVote?'not-allowed':'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                  {myVote===duel.candidateA.id ? '✓ Voté' : <><StarRed /> Voter {duel.candidateA.stage_name?.split(' ')[0]??'A'}</>}
                </button>
                <button onClick={()=>onVote(duel.id, duel.candidateB.id)} disabled={!!myVote}
                  style={{ padding:'9px', borderRadius:10, border:'none', background: myVote===duel.candidateB.id?'rgba(74,222,128,0.15)':myVote?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#FFAA00,#FF6B00)', color: myVote===duel.candidateB.id?'#4ade80':myVote?'rgba(255,255,255,0.3)':'#000', fontSize:12, fontWeight:700, cursor:myVote?'not-allowed':'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                  {myVote===duel.candidateB.id ? '✓ Voté' : <><StarRed /> Voter {duel.candidateB.stage_name?.split(' ')[0]??'B'}</>}
                </button>
              </div>
            )}

            {isEqual && (
              <div style={{ marginTop:10, background:'rgba(255,170,0,0.06)', border:'1px solid rgba(255,170,0,0.2)', borderRadius:8, padding:'8px 12px', fontSize:11, color:'rgba(255,170,0,0.8)', textAlign:'center' as const }}>
                ⚖️ Égalité ! Si le score reste identique à la fin, une prolongation de <strong>5 jours</strong> sera déclenchée automatiquement.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BracketPage() {
  const router = useRouter();
  const params = useParams();
  const [bracket,    setBracket]    = useState<Bracket | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [myVotes,    setMyVotes]    = useState<Record<string,string>>({});
  const [activeRound,setActiveRound]= useState(1);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) { setLoading(false); return; }
    Promise.all([
      fetch(`${API}/brackets/${id}`).then(r => r.json()),
      fetch(`${API}/brackets/${id}/duels`).then(r => r.json()),
    ]).then(([bRes, dRes]) => {
      if (!bRes.success) throw new Error();
      const b = bRes.data;
      const duelsRaw = dRes.success ? dRes.data : [];
      const mapCand = (p: any, pid: string): Candidate => ({
        id: pid,
        name: p?.users?.name ?? 'Candidat',
        stage_name: p?.users?.name ?? 'Candidat',
        photo_url: p?.users?.avatar_url ?? undefined,
        votes: 0, video_id: p?.video_id ?? undefined,
      });
      const duels: Duel[] = duelsRaw.map((d: any) => ({
        id: d.id, round: d.round,
        candidateA: mapCand(d.part_a, d.participant_a),
        candidateB: mapCand(d.part_b, d.participant_b),
        winner_id: d.winner_participant ?? undefined,
        status: d.status === 'overtime' ? 'overtime' : d.status === 'done' ? 'done' : 'active',
        ends_at: d.ends_at ?? '', votes_a: d.votes_a, votes_b: d.votes_b,
        pool_label: d.pool_label ?? undefined,
      } as any));
      const ROUND_OBJ: Record<number, {label: string}> = {
        1:{label:'Huiti\u00E8me de finale'},2:{label:'Quart de finale'},
        3:{label:'Demi-finale'},4:{label:'Finale'},
      };
      const roundsData = (b.bracket_rounds ?? []).sort((a:any,x:any)=>a.round-x.round);
      const rounds = roundsData.map((r: any) => ({
        round: r.round, label: ROUND_OBJ[r.round]?.label ?? ('Tour '+r.round),
        days: 0, duels: duels.filter(d => d.round === r.round),
        objectif: r.objectif_montant, collecte: r.montant_collecte, statusRound: r.status,
      }));
      setBracket({
        id: b.id, title: b.title, discipline: b.discipline,
        type: 'libre', status: b.status, rounds,
        current_round: b.current_round || 1,
        total_cagnotte: b.total_cagnotte,
        commission_pct: (b.commission_pct ?? 0.5) * 100,
        starts_at: b.started_at ?? '',
        code: b.code, participants_count: b.bracket_participants?.[0]?.count ?? 0,
        max_participants: b.max_participants ?? 16,
      } as any);
      setActiveRound(b.current_round || 1);
    }).catch(() => setBracket(null))
      .finally(() => setLoading(false));
  }, [params?.id]);

  const handleVote = async (duelId: string, candidateId: string) => {
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }
    try {
      const res = await fetch(`${API}/brackets/arena/vote`, {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ duel_id: duelId, participant_id: candidateId }),
      });
      const data = await res.json();
      if (!data.success) {
        if ((data.error || '').toLowerCase().includes('solde')) {
          if (confirm('Solde insuffisant. Veux-tu recharger ton compte ?')) router.push('/recharge');
        } else { alert(data.error || 'Erreur lors du vote.'); }
        return;
      }
      setMyVotes(v => ({...v, [duelId]: candidateId}));
      setBracket((prev: any) => {
        if (!prev) return prev;
        const rounds = prev.rounds.map((r: any) => ({
          ...r,
          duels: r.duels.map((d: any) => {
            if (d.id !== duelId) return d;
            const isA = d.candidateA.id === candidateId;
            return { ...d, votes_a: d.votes_a + (isA?1:0), votes_b: d.votes_b + (isA?0:1) };
          }),
        }));
        return { ...prev, rounds, total_cagnotte: prev.total_cagnotte + 100 };
      });
    } catch { alert('Erreur reseau. Reessaie.'); }
  };

  const handleInscribe = async () => {
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }
    try {
      const vr = await fetch(`${API}/videos/my`, { headers: { Authorization: `Bearer ${token}` } });
      const vd = await vr.json();
      const approved = (vd.videos ?? []).filter((v: any) => v.status === 'approved');
      if (approved.length === 0) {
        alert('Tu dois avoir au moins une video approuvee pour participer.');
        return;
      }
      const video_id = approved[0].id;
      const res = await fetch(`${API}/brackets/arena/inscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bracket_id: params?.id, video_id }),
      });
      const data = await res.json();
      if (!data.success) { alert(data.error || 'Erreur lors de l inscription.'); return; }
      alert('Inscription reussie !');
      window.location.reload();
    } catch {
      alert('Erreur reseau. Reessaie.');
    }
  };

  if (loading) return <div style={{ height:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)', fontFamily:'DM Sans,sans-serif' }}>⏳ Chargement…</div>;
  if (!bracket) return ( /*DKDK_INTROUVABLE*/
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f0', fontFamily:'DM Sans,sans-serif', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:18, padding:'24px', textAlign:'center' }}>
      <div style={{ fontSize:48 }}>{'\u{1F50D}'}</div>
      <div style={{ fontSize:18, fontWeight:700, fontFamily:'Syne,sans-serif' }}>Challenge introuvable</div>
      <div style={{ fontSize:14, color:'rgba(255,255,255,0.6)', maxWidth:340 }}>Ce challenge n existe pas ou n est plus disponible.</div>
      <button onClick={() => router.push('/challenges')} style={{ marginTop:6, padding:'12px 22px', borderRadius:12, fontSize:14, fontWeight:700, fontFamily:'Syne,sans-serif', cursor:'pointer', border:'none', background:'linear-gradient(135deg,#FF6B00,#FFD700)', color:'#000' }}>Retour aux challenges</button>
    </div>
  );

  const currentRoundData = bracket.rounds.find(r=>r.round===activeRound);
  const totalVotes = bracket.rounds.flatMap(r=>r.duels).reduce((s,d)=>s+d.votes_a+d.votes_b, 0);
  const netCagnotte = Math.round(bracket.total_cagnotte * (1 - bracket.commission_pct/100));

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f0', fontFamily:'DM Sans,sans-serif', paddingBottom:80 }}>
      <Navbar />
      <div style={{ padding: '16px 24px 10px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(0.75rem,3vw,1.9rem)', lineHeight: 1.1, marginBottom: 8, whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {/*DKDK_TITLE_SPACING_FIX*/}
          Podium Challenges{' '}
          <span style={{ background: 'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Arena </span>
        </h1>
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'24px 16px' }}>

        {/* Header bracket */}
        <div style={{ background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border:'1px solid rgb(10,0,0)', borderRadius:16, padding:'20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:14, color:'#fff', fontWeight:800, letterSpacing:'.12em', marginBottom:4, textAlign:'center' as const }}>{bracket.status === 'in_progress' ? 'CHALLENGE EN COURS' : 'INSCRIPTIONS OUVERTES'}</div>
              <div style={{ fontSize:11, color:'#FFD700', fontWeight:700, textAlign:'center' as const, marginBottom:8 }}>{(bracket as any).code ?? ''}</div>
              <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'#ffffff', marginBottom:6, textAlign:'center' as const, textShadow:'0 1px 3px rgba(0,0,0,0.5)' }}>{((bracket as any).style && bracket.discipline) ? ((bracket as any).style + ' — ' + bracket.discipline.charAt(0).toUpperCase() + bracket.discipline.slice(1)) : bracket.title}</h1>
              {bracket.status === 'in_progress' && <div style={{ fontSize:12, color:'rgb(255,255,255)' }}>Tour en cours : <strong style={{color:OR}}>{ROUND_LABELS[bracket.current_round]}</strong></div>}
            </div>
            {bracket.status === 'in_progress' && (
            <div style={{ textAlign:'right' as const }}>
              <div style={{ fontSize:14, color:'rgba(255,255,255,0.99)', marginBottom:4 }}><span style={{ fontSize:28 }}>🏆</span> Cagnotte nette</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#0dc41f', fontFamily:'Syne,sans-serif', lineHeight:1 }}>{netCagnotte.toLocaleString('fr-FR')} F</div>
              <div style={{ fontSize:12, color:'rgb(255,255,255)', marginTop:4 }}>après commission Diki-Diki</div>
            </div>
            )}
          </div>

          {/* ✅ Stats — seulement si lance */}
          {bracket.status === 'in_progress' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { label:'Votes totaux', val: totalVotes.toLocaleString('fr-FR'), icon:<StarRed /> },
              { label:'Duels joués', val: bracket.rounds.flatMap(r=>r.duels).filter(d=>d.status==='done').length+' / '+bracket.rounds.flatMap(r=>r.duels).length, icon:'⚔️' },
              { label:'Candidats', val: String((bracket.rounds[0]?.duels.length ?? 0) * 2), icon:'👥' },
            ].map(s=>(
              <div key={s.label} style={{ background:'rgba(8,8,8,0)', borderRadius:10, padding:'18px 10px', textAlign:'center' as const }}>
                <div style={{ fontSize:34, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:34, fontWeight:800, color:OR, fontFamily:'Syne,sans-serif', lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:14, color:'rgb(246,243,243)', marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* ✅ Règles — affichees seulement si lance */}
        {bracket.status === 'in_progress' && (
        <div style={{ background:'rgba(7,6,6,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 18px', marginBottom:20, fontSize:12, color:'rgba(255,255,255,0.75)', lineHeight:1.6, lineHeight:1.8 }}>
          📋 <strong style={{color:'rgba(255,255,255,0.6)'}}>Règles :</strong> Le plus voté <StarRed /> passe au tour suivant · Chaque étape se termine à l'objectif de cagnotte atteint · Égalité = mini-défi de <strong style={{color:OR}}>3 jours</strong> · Le champion remporte 75% de la cagnotte nette, le finaliste 25%
        </div>
        )}

        {/* Navigation des tours — seulement si lance */}
        {bracket.status === 'in_progress' && (
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {bracket.rounds.map(r => {
            const isDone  = r.round < bracket.current_round;
            const isCurr  = r.round === bracket.current_round;
            return (
              <button key={r.round} onClick={()=>setActiveRound(r.round)}
                style={{ padding:'9px 8px', borderRadius:50, fontSize:11, fontWeight:700, cursor:'pointer', flex:1, whiteSpace:'nowrap' as const, textAlign:'center' as const, border:`1px solid ${activeRound===r.round?OR:'rgba(255,255,255,0.1)'}`, background: activeRound===r.round?`linear-gradient(135deg,${OR},${OR2})`:isDone?'rgba(74,222,128,0.08)':isCurr?'rgba(255,170,0,0.08)':'rgba(255,255,255,0.04)', color: activeRound===r.round?'#000':isDone?'#4ade80':isCurr?OR:'rgba(255,255,255,0.4)' }}>
                {isDone&&activeRound!==r.round?'✓ ':''}{r.label} · {(r as any).objectif ? Math.round(((r as any).collecte ?? 0)/(r as any).objectif*100) : 0}%
              </button>
            );
          })}
        </div>
        )}

        {/* Bloc inscriptions ouvertes (bracket pas encore lance) */}
        {(bracket.status === 'waiting_candidates' || bracket.status === 'open') && (() => {
          const cnt = (bracket as any).participants_count ?? 0;
          const max = (bracket as any).max_participants ?? 16;
          const pct = Math.round(cnt / max * 100);
          return (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:'24px', textAlign:'center' as const, marginBottom:20 }}>
              <div style={{ fontSize:40, marginBottom:10 }}>{'\u{1F4E2}'}</div>
              <div style={{ fontSize:18, fontWeight:800, fontFamily:'Syne,sans-serif', color:'#fff', marginBottom:8 }}>Inscriptions ouvertes</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginBottom:16 }}>Le tournoi d{'\u00E9'}marrera automatiquement {'\u00E0'} {max} candidats inscrits.</div>
              <div style={{ fontSize:30, fontWeight:800, fontFamily:'Syne,sans-serif', color:OR, marginBottom:6 }}>{cnt} / {max}</div>
              <div style={{ height:10, background:'rgba(255,255,255,0.08)', borderRadius:6, overflow:'hidden', marginBottom:20 }}>
                <div style={{ height:'100%', width:pct+'%', background:'linear-gradient(90deg,#FF6B00,#FFD700)', transition:'width 0.4s' }} />
              </div>
              <button onClick={handleInscribe} style={{ width:'100%', padding:'14px', borderRadius:14, fontSize:15, fontWeight:800, fontFamily:'Syne,sans-serif', cursor:'pointer', border:'none', background:'linear-gradient(135deg,#FF6B00,#FFD700)', color:'#000' }}>Je participe</button>
            </div>
          );
        })()}
        {/* Duels du tour actif */}
        {currentRoundData && (
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              ⚔️ {currentRoundData.label}
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:400 }}>{currentRoundData.duels.length} duel{currentRoundData.duels.length>1?'s':''}</span>
            </div>
            {currentRoundData.duels.map(duel => (
              <DuelCard key={duel.id} duel={duel} onVote={handleVote} myVote={myVotes[duel.id]}/>
            ))}
          </div>
        )}
      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}>
        <TickerBand />
      </div>
    </div>
  );
}

