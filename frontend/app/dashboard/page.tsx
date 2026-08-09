'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

function apiFetch(endpoint: string, token: string) {
  return fetch(`${API}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }).then(r => r.json());
}

// ─── TYPES ───────────────────────────────────────────────────
interface Stats { users?: number; votes?: number; contests?: number; revenue?: number; }
interface Contest { id: string; title: string; discipline: string; status: string; comp_type: string; ends_at: string; }
interface User { id: string; name: string; email?: string; phone?: string; role?: string; wallet?: number; created_at?: string; }
interface Video { id: string; title?: string; status: string; user_id: string; created_at?: string; storage_url?: string; }

// ─── ICÔNES SVG ─────────────────────────────────────────────
const Icon = {
  stats:    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18M7 16l4-4 4 4 4-8"/></svg>,
  contests: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 21V9M17 3H7l-2 6h14l-2-6z"/></svg>,
  users:    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  videos:   <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.277A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>,
  wallet:   <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 10h18M7 15h1m4 0h1M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/></svg>,
  plus:     <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
  check:    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>,
  x:        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  refresh:  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
};

type Tab = 'stats' | 'contests' | 'users' | 'videos' | 'transactions' | 'content';

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [userRole, setUserRole] = useState('');
  const [tab, setTab] = useState<Tab>('stats');

  // Stats
  const [stats, setStats] = useState<Stats>({});
  const [statsLoading, setStatsLoading] = useState(true);

  // Contests
  const [contests, setContests] = useState<Contest[]>([]);
  const [contestsLoading, setContestsLoading] = useState(false);
  const [newContest, setNewContest] = useState({ title: '', discipline: 'danse', comp_type: 'duo', duration_days: 30 });
  const [showForm, setShowForm] = useState(false);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Videos
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  // Contenu
const [categories, setCategories] = useState<any[]>([]);
const [disciplines, setDisciplines] = useState<any[]>([]);
const [subjects, setSubjects] = useState<any[]>([]);
const [selectedCatId, setSelectedCatId] = useState('');
const [selectedDiscId, setSelectedDiscId] = useState('');
const [newDiscName, setNewDiscName] = useState('');
const [newDiscEmoji, setNewDiscEmoji] = useState('🎯');
const [newSubjectName, setNewSubjectName] = useState('');
const [contentLoading, setContentLoading] = useState(false);

  // Messages
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  useEffect(() => {
    const stored = localStorage.getItem('dkdk_user');
    const tok = localStorage.getItem('pac_token') || '';
    if (!stored || !tok) { router.push('/auth/login'); return; }
    const u = JSON.parse(stored);
    setUserRole(u.role || 'user');
    setToken(tok);
    if (u.role !== 'admin' && u.role !== 'administrateur') {
      // Écran utilisateur simple
      return;
    }
    // Charger stats
    loadStats(tok);
  }, []);

  async function loadStats(tok: string) {
    setStatsLoading(true);
    try {
      const data = await apiFetch('/stats', tok);
      setStats(data);
    } catch { }
    finally { setStatsLoading(false); }
  }

  async function loadContests() {
    setContestsLoading(true);
    try {
      const data = await apiFetch('/contests', token);
      setContests(data.data || data.contests || data || []);
    } catch { }
    finally { setContestsLoading(false); }
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const data = await apiFetch('/users', token);
      setUsers(Array.isArray(data) ? data : Array.isArray(data.users) ? data.users : []);
    } catch { }
    finally { setUsersLoading(false); }
  }

  async function loadVideos() {
    setVideosLoading(true);
    try {
      const data = await apiFetch('/videos/pending', token);
      setVideos(Array.isArray(data) ? data : Array.isArray(data.videos) ? data.videos : []);
    } catch { }
    finally { setVideosLoading(false); }
  }

  async function handleTabChange(t: Tab) {
    setTab(t);
    if (t === 'contests' && contests.length === 0) loadContests();
    if (t === 'users' && users.length === 0) loadUsers();
    if (t === 'videos' && videos.length === 0) loadVideos();
    if (t === 'content' && categories.length === 0) loadContent();
  }

  async function handleCreateContest() {
    try {
      const res = await fetch(`${API}/contests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newContest),
      });
      if (res.ok) {
        showMsg('Challenge créé !', true);
        setShowForm(false);
        setNewContest({ title: '', discipline: 'danse', comp_type: 'duo', duration_days: 30 });
        loadContests();
      } else { showMsg('Erreur lors de la création.', false); }
    } catch { showMsg('Erreur réseau.', false); }
  }

  async function handleSetContestStatus(id: string, status: string) {
    try {
      const res = await fetch(`${API}/contests/${id}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { showMsg(`Statut mis à jour : ${status}`, true); loadContests(); }
      else { showMsg('Erreur.', false); }
    } catch { showMsg('Erreur réseau.', false); }
  }
async function loadContent() {
  setContentLoading(true);
  try {
    const data = await fetch(`${API}/categories`).then(r => r.json());
    setCategories(Array.isArray(data) ? data : []);
  } catch {} finally { setContentLoading(false); }
}

async function loadDisciplines(catId: string) {
  setSelectedCatId(catId);
  setSelectedDiscId('');
  setSubjects([]);
  const data = await fetch(`${API}/categories/${catId}/disciplines`).then(r => r.json());
  setDisciplines(Array.isArray(data) ? data : []);
}

async function loadSubjects(discId: string) {
  setSelectedDiscId(discId);
  const data = await fetch(`${API}/categories/disciplines/${discId}/subjects`).then(r => r.json());
  setSubjects(Array.isArray(data) ? data : []);
}

async function handleAddDiscipline() {
  if (!newDiscName || !selectedCatId) return;
  const res = await fetch(`${API}/categories/disciplines`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ category_id: selectedCatId, name: newDiscName, emoji: newDiscEmoji }),
  });
  if (res.ok) { showMsg('Discipline ajoutée !', true); setNewDiscName(''); loadDisciplines(selectedCatId); }
  else showMsg('Erreur.', false);
}

async function handleDeleteDiscipline(id: string) {
  if (!confirm('Supprimer cette discipline ?')) return;
  const res = await fetch(`${API}/categories/disciplines/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) { showMsg('Discipline supprimée.', true); loadDisciplines(selectedCatId); }
}

async function handleAddSubject() {
  if (!newSubjectName || !selectedDiscId) return;
  const res = await fetch(`${API}/categories/disciplines/subjects`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ discipline_id: selectedDiscId, name: newSubjectName }),
  });
  if (res.ok) { showMsg('Sujet ajouté !', true); setNewSubjectName(''); loadSubjects(selectedDiscId); }
  else showMsg('Erreur.', false);
}

async function handleDeleteSubject(id: string) {
  if (!confirm('Supprimer ce sujet ?')) return;
  const res = await fetch(`${API}/categories/disciplines/subjects/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) { showMsg('Sujet supprimé.', true); loadSubjects(selectedDiscId); }
}
  async function handleModerateVideo(id: string, decision: string) {
    try {
      const res = await fetch(`${API}/videos/${id}/moderate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        showMsg(decision === 'approved' ? 'Vidéo approuvée !' : 'Vidéo rejetée.', true);
        loadVideos();
      } else { showMsg('Erreur.', false); }
    } catch { showMsg('Erreur réseau.', false); }
  }

  // ─── ÉCRAN UTILISATEUR ───────────────────────────────────
 // ─── ÉCRAN UTILISATEUR ───────────────────────────────────
  if (userRole && userRole !== 'admin' && userRole !== 'administrateur') {
    return (
      <div style={{ background: '#08080f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px', fontFamily: 'sans-serif' }}>Bienvenue sur PAC !</h2>
          <p style={{ color: 'rgba(255,255,255,.5)', marginBottom: '24px', fontFamily: 'sans-serif' }}>Découvre les challenges en cours</p>
          <a href="/vote" style={{ background: 'linear-gradient(135deg,#FFB800,#FF6B00)', color: '#000', padding: '12px 32px', borderRadius: '12px', fontWeight: 700, textDecoration: 'none', fontSize: '15px', fontFamily: 'sans-serif' }}>
            Voir les Challenges
          </a>
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'stats',        label: 'Statistiques', icon: Icon.stats },
    { key: 'contests',     label: 'Challenges', icon: Icon.contests },
    { key: 'users',        label: 'Utilisateurs', icon: Icon.users },
    { key: 'videos',       label: 'Vidéos',       icon: Icon.videos },
    { key: 'transactions', label: 'Transactions', icon: Icon.wallet },
    { key: 'content', label: 'Contenu', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg> },
  ];

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.includes(userSearch)
  );

  const STATUS_COLORS: Record<string, string> = {
    active: '#22c55e', inactive: '#6b7280', pending: '#f59e0b', ended: '#ef4444',
    approved: '#22c55e', rejected: '#ef4444',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#08080f}
        .adm{min-height:100vh;background:#08080f;font-family:'DM Sans',sans-serif;color:#fff}
        .topbar{background:rgba(255,255,255,.03);border-bottom:0.5px solid rgba(255,255,255,.07);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;backdrop-filter:blur(20px)}
        .logo{font-family:'Syne',sans-serif;font-size:17px;font-weight:800}
        .badge{background:rgba(255,140,0,.15);color:#FF8C00;border:0.5px solid rgba(255,140,0,.3);padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .tabs-bar{display:flex;gap:2px;background:rgba(255,255,255,.03);border-bottom:0.5px solid rgba(255,255,255,.07);padding:0 20px;overflow-x:auto}
        .tab{display:flex;align-items:center;gap:6px;padding:14px 16px;font-size:13px;font-weight:500;color:rgba(255,255,255,.4);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .2s;background:none;border-left:none;border-right:none;border-top:none;font-family:'DM Sans',sans-serif}
        .tab.active{color:#FF8C00;border-bottom-color:#FF8C00}
        .tab:hover:not(.active){color:rgba(255,255,255,.7)}
        .content{max-width:1000px;margin:0 auto;padding:24px 20px}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
        .kpi{background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;position:relative;overflow:hidden}
        .kpi-val{font-size:28px;font-weight:700;font-family:'Syne',sans-serif;margin:8px 0 4px}
        .kpi-lbl{font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px}
        .kpi-sub{font-size:11px;color:rgba(255,255,255,.25);margin-top:4px}
        .section-title{font-size:15px;font-weight:600;color:#fff;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
        .card{background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;margin-bottom:16px}
        .table-head{display:grid;padding:10px 16px;background:rgba(255,255,255,.03);border-bottom:0.5px solid rgba(255,255,255,.06);font-size:11px;font-weight:600;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.5px}
        .table-row{display:grid;padding:12px 16px;border-bottom:0.5px solid rgba(255,255,255,.04);align-items:center;transition:background .15s}
        .table-row:hover{background:rgba(255,255,255,.03)}
        .table-row:last-child{border-bottom:none}
        .badge-status{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
        .btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all .2s}
        .btn-orange{background:#FF8C00;color:#000}
        .btn-orange:hover{background:#e07a00}
        .btn-green{background:rgba(34,197,94,.15);color:#22c55e;border:0.5px solid rgba(34,197,94,.3)}
        .btn-green:hover{background:rgba(34,197,94,.25)}
        .btn-red{background:rgba(239,68,68,.15);color:#ef4444;border:0.5px solid rgba(239,68,68,.3)}
        .btn-red:hover{background:rgba(239,68,68,.25)}
        .btn-ghost{background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);border:0.5px solid rgba(255,255,255,.1)}
        .btn-ghost:hover{background:rgba(255,255,255,.1)}
        .input{width:100%;background:rgba(255,255,255,.06);border:0.5px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:14px;color:#fff;outline:none}
        .input:focus{border-color:#FF8C00}
        .input::placeholder{color:rgba(255,255,255,.2)}
        .select{appearance:none;background:rgba(255,255,255,.06);border:0.5px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:14px;color:#fff;outline:none;cursor:pointer}
        .select option{background:#1a1a2e}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
        .form-label{font-size:11px;font-weight:600;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;display:block}
        .msg{position:fixed;top:70px;right:20px;padding:12px 20px;border-radius:12px;font-size:13px;z-index:200;animation:slideIn .3s}
        .msg.ok{background:rgba(34,197,94,.15);border:0.5px solid rgba(34,197,94,.3);color:#4ade80}
        .msg.err{background:rgba(239,68,68,.15);border:0.5px solid rgba(239,68,68,.3);color:#f87171}
        .empty{text-align:center;padding:40px;color:rgba(255,255,255,.3);font-size:13px}
        .spinner{width:20px;height:20px;border:2px solid rgba(255,140,0,.2);border-top-color:#FF8C00;border-radius:50%;animation:spin .6s linear infinite;margin:40px auto}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @media(max-width:600px){.kpi-grid{grid-template-columns:1fr 1fr}.form-grid{grid-template-columns:1fr}.tabs-bar{padding:0 10px}.content{padding:16px 12px}}
      `}</style>

      <div className="adm">

        {/* Topbar */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🏆</span>
            <span className="logo"><span style={{ color: '#fff' }}>PAC</span> <span style={{ color: '#FF8C00' }}>Admin</span></span>
            <span className="badge">Administrateur</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={() => { loadStats(token); showMsg('Données actualisées', true); }}>
              {Icon.refresh} Actualiser
            </button>
            <button className="btn btn-ghost" onClick={() => { localStorage.removeItem('pac_token'); localStorage.removeItem('dkdk_user'); router.push('/auth/login'); }}>
              Déconnexion
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar">
          {TABS.map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => handleTabChange(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Message flottant */}
        {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`}>{msg.ok ? '✅' : '⚠️'} {msg.text}</div>}

        <div className="content">

          {/* ─── STATS ─────────────────────────────────────── */}
          {tab === 'stats' && (
            <>
              <div className="kpi-grid">
                {[
                  { label: 'Utilisateurs', val: statsLoading ? '...' : (stats.users ?? '—'), sub: 'Total inscrits', color: '#FF8C00', icon: '👥' },
                  { label: 'Votes',        val: statsLoading ? '...' : (stats.votes ?? '—'), sub: 'Votes enregistrés', color: '#22c55e', icon: '🗳️' },
                  { label: 'Challenges', val: statsLoading ? '...' : (stats.contests ?? '—'), sub: 'En cours', color: '#3b82f6', icon: '🏆' },
                  { label: 'Revenus',      val: statsLoading ? '...' : (stats.revenue ? `${Number(stats.revenue).toLocaleString('fr-FR')} F` : '—'), sub: 'CFA collectés', color: '#a855f7', icon: '💰' },
                ].map(k => (
                  <div key={k.label} className="kpi" style={{ borderColor: `${k.color}30` }}>
                    <div style={{ position: 'absolute', right: '16px', top: '16px', fontSize: '28px', opacity: .15 }}>{k.icon}</div>
                    <div className="kpi-lbl" style={{ color: k.color }}>{k.label}</div>
                    <div className="kpi-val" style={{ color: k.color }}>{k.val}</div>
                    <div className="kpi-sub">{k.sub}</div>
                  </div>
                ))}
              </div>

              {statsLoading ? (
                <div className="spinner" />
              ) : (
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: '13px' }}>
                    📊 Les graphiques détaillés seront disponibles une fois les données backend connectées.<br />
                    <span style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>
                      Endpoint : <code style={{ color: '#FF8C00' }}>/v1/stats</code>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── CHALLENGES ──────────────────────────────── */}
          {tab === 'contests' && (
            <>
              <div className="section-title">
                <span>🎭 Gestion des challenges</span>
                <button className="btn btn-orange" onClick={() => setShowForm(f => !f)}>
                  {Icon.plus} Nouveau challenge
                </button>
              </div>

              {/* Formulaire création */}
              {showForm && (
                <div className="card" style={{ padding: '20px', marginBottom: '16px', borderColor: 'rgba(255,140,0,.2)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: '#FF8C00' }}>➕ Créer un challenge</div>
                  <div className="form-grid">
                    <div>
                      <label className="form-label">Titre *</label>
                      <input className="input" placeholder="Ex: Battle de Danse Africaine" value={newContest.title} onChange={e => setNewContest(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Discipline</label>
                      <select className="select" style={{ width: '100%' }} value={newContest.discipline} onChange={e => setNewContest(f => ({ ...f, discipline: e.target.value }))}>
                        {['danse','chant','instrument','acapella','humour','poesie'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Type</label>
                      <select className="select" style={{ width: '100%' }} value={newContest.comp_type} onChange={e => setNewContest(f => ({ ...f, comp_type: e.target.value }))}>
                        <option value="duo">Duo</option>
                        <option value="groupe">Groupe</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Durée (jours)</label>
                      <input className="input" type="number" min="1" max="365" value={newContest.duration_days} onChange={e => setNewContest(f => ({ ...f, duration_days: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-orange" onClick={handleCreateContest}>Créer</button>
                    <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}>
                  <span>Titre</span><span>Discipline</span><span>Type</span><span>Statut</span><span>Actions</span>
                </div>
                {contestsLoading ? <div className="spinner" /> :
                  contests.length === 0 ? <div className="empty">Aucun challenge trouvée</div> :
                  contests.map(c => (
                    <div className="table-row" key={c.id} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}>
                      <span style={{ fontWeight: 500, fontSize: '13px' }}>{c.title}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', textTransform: 'capitalize' }}>{c.discipline}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', textTransform: 'capitalize' }}>{c.comp_type}</span>
                      <span className="badge-status" style={{ background: `${STATUS_COLORS[c.status] || '#6b7280'}20`, color: STATUS_COLORS[c.status] || '#6b7280', border: `0.5px solid ${STATUS_COLORS[c.status] || '#6b7280'}40` }}>
                        {c.status}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {c.status !== 'active' && <button className="btn btn-green" onClick={() => handleSetContestStatus(c.id, 'active')}>{Icon.check}</button>}
                        {c.status === 'active' && <button className="btn btn-ghost" onClick={() => handleSetContestStatus(c.id, 'inactive')}>{Icon.x}</button>}
                      </div>
                    </div>
                  ))
                }
              </div>
            </>
          )}

          {/* ─── UTILISATEURS ──────────────────────────────── */}
          {tab === 'users' && (
            <>
              <div className="section-title">
                <span>👥 Gestion des utilisateurs</span>
                <button className="btn btn-ghost" onClick={loadUsers}>{Icon.refresh} Actualiser</button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <input className="input" placeholder="🔍 Rechercher par nom, email ou téléphone..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>

              <div className="card">
                <div className="table-head" style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr' }}>
                  <span>Nom</span><span>Contact</span><span>Rôle</span><span>Solde</span><span>Actions</span>
                </div>
                {usersLoading ? <div className="spinner" /> :
                  filteredUsers.length === 0 ? <div className="empty">Aucun utilisateur trouvé</div> :
                  filteredUsers.slice(0, 50).map(u => (
                    <div className="table-row" key={u.id} style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr' }}>
                      <span style={{ fontWeight: 500, fontSize: '13px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,140,0,.15)', color: '#FF8C00', fontSize: '11px', fontWeight: 700, marginRight: '8px' }}>
                          {u.name?.charAt(0)?.toUpperCase()}
                        </span>
                        {u.name}
                      </span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)' }}>{u.email || u.phone || '—'}</span>
                      <span className="badge-status" style={{ background: u.role === 'admin' ? 'rgba(255,140,0,.15)' : 'rgba(255,255,255,.06)', color: u.role === 'admin' ? '#FF8C00' : 'rgba(255,255,255,.4)', border: u.role === 'admin' ? '0.5px solid rgba(255,140,0,.3)' : '0.5px solid rgba(255,255,255,.1)' }}>
                        {u.role || 'user'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                        {u.wallet !== undefined ? `${Number(u.wallet).toLocaleString('fr-FR')} F` : '—'}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
  <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 8px' }}
    onClick={() => { if(confirm(`Bloquer ${u.name} ?`)) showMsg('Fonctionnalité à venir', false); }}
    title="Bloquer">
    🔒
  </button>
  <button className="btn btn-ghost" style={{ fontSize: '10px', padding: '4px 8px' }}
    onClick={() => { if(confirm(`Promouvoir ${u.name} en admin ?`)) showMsg('Fonctionnalité à venir', false); }}
    title="Promouvoir admin">
    ⭐
  </button>
</div>
                    </div>
                  ))
                }
              </div>
              {filteredUsers.length > 50 && (
                <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,.3)', marginTop: '8px' }}>
                  Affichage des 50 premiers résultats sur {filteredUsers.length}
                </div>
              )}
            </>
          )}

          {/* ─── VIDÉOS ────────────────────────────────────── */}
          {tab === 'videos' && (
            <>
              <div className="section-title">
                <span>🎬 Modération des vidéos</span>
                <button className="btn btn-ghost" onClick={loadVideos}>{Icon.refresh} Actualiser</button>
              </div>

              <div className="card">
                <div className="table-head" style={{ gridTemplateColumns: '2fr 2fr 1fr auto' }}>
                  <span>Vidéo</span><span>Utilisateur</span><span>Statut</span><span>Actions</span>
                </div>
                {videosLoading ? <div className="spinner" /> :
                  videos.length === 0 ? (
                    <div className="empty">
                      ✅ Aucune vidéo en attente de modération
                    </div>
                  ) :
                  videos.map(v => (
                    <div className="table-row" key={v.id} style={{ gridTemplateColumns: '2fr 2fr 1fr auto' }}>
                      <span style={{ fontWeight: 500, fontSize: '13px' }}>{v.title || `Vidéo ${v.id.slice(0,8)}`}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)' }}>{v.user_id?.slice(0, 12)}...</span>
                      <span className="badge-status" style={{ background: `${STATUS_COLORS[v.status] || '#6b7280'}20`, color: STATUS_COLORS[v.status] || '#6b7280', border: `0.5px solid ${STATUS_COLORS[v.status] || '#6b7280'}40` }}>
                        {v.status}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-green" onClick={() => handleModerateVideo(v.id, 'approved')} title="Approuver">{Icon.check} OK</button>
                        <button className="btn btn-red" onClick={() => handleModerateVideo(v.id, 'rejected')} title="Rejeter">{Icon.x} Rejeter</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </>
          )}
{/* ─── CONTENU ───────────────────────────────────── */}
{tab === 'content' && (
  <>
    <div className="section-title"><span>📚 Gestion du contenu</span></div>

    {/* Catégories */}
    <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#FF8C00', marginBottom: '14px' }}>🗂️ Catégories</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => loadDisciplines(cat.id)}
            className="btn" style={{ background: selectedCatId === cat.id ? '#FF8C00' : 'rgba(255,255,255,.06)', color: selectedCatId === cat.id ? '#000' : '#fff', border: '0.5px solid rgba(255,255,255,.1)' }}>
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>
    </div>

    {/* Disciplines */}
    {selectedCatId && (
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#FF8C00', marginBottom: '14px' }}>
          🎯 Disciplines — {categories.find(c => c.id === selectedCatId)?.name}
        </div>

        {/* Ajouter discipline */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input className="input" style={{ width: '60px' }} placeholder="🎭" value={newDiscEmoji} onChange={e => setNewDiscEmoji(e.target.value)} />
          <input className="input" placeholder="Nom de la discipline..." value={newDiscName} onChange={e => setNewDiscName(e.target.value)} />
          <button className="btn btn-orange" onClick={handleAddDiscipline}>+ Ajouter</button>
        </div>

        {/* Liste disciplines */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {disciplines.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: selectedDiscId === d.id ? 'rgba(255,140,0,.15)' : 'rgba(255,255,255,.06)', border: `0.5px solid ${selectedDiscId === d.id ? 'rgba(255,140,0,.4)' : 'rgba(255,255,255,.1)'}`, borderRadius: '8px', padding: '6px 10px' }}>
              <span style={{ cursor: 'pointer', fontSize: '13px', color: '#fff' }} onClick={() => loadSubjects(d.id)}>{d.emoji} {d.name}</span>
              <button onClick={() => handleDeleteDiscipline(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '12px', marginLeft: '4px' }}>✕</button>
            </div>
          ))}
          {disciplines.length === 0 && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.3)' }}>Aucune discipline</div>}
        </div>
      </div>
    )}

    {/* Sujets */}
    {selectedDiscId && (
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#FF8C00', marginBottom: '14px' }}>
          🎵 Sujets — {disciplines.find(d => d.id === selectedDiscId)?.name}
        </div>

        {/* Ajouter sujet */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input className="input" placeholder="Nom du sujet / morceau..." value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
          <button className="btn btn-orange" onClick={handleAddSubject}>+ Ajouter</button>
        </div>

        {/* Liste sujets */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {subjects.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.1)', borderRadius: '20px', padding: '5px 12px' }}>
              <span style={{ fontSize: '12px', color: '#fff' }}>{s.name}</span>
              <button onClick={() => handleDeleteSubject(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '11px' }}>✕</button>
            </div>
          ))}
          {subjects.length === 0 && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.3)' }}>Aucun sujet</div>}
        </div>
      </div>
    )}
  </>
)}
          {/* ─── TRANSACTIONS ──────────────────────────────── */}
          {tab === 'transactions' && (
            <>
              <div className="section-title">
                <span>💰 Historique des transactions</span>
              </div>
              <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>💳</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                  Historique des paiements CinetPay
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', marginBottom: '20px' }}>
                  Cette section sera disponible une fois CinetPay connecté en production.
                </div>
                <div style={{ display: 'inline-flex', gap: '8px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,140,0,.1)', color: '#FF8C00', border: '0.5px solid rgba(255,140,0,.2)', fontSize: '12px' }}>
                    Endpoint : /v1/payment/history
                  </span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

