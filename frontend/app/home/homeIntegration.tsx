// ═══════════════════════════════════════════════════════════════
//  INTÉGRATION dans frontend/app/home/page.tsx
//  Ajoute le CountrySelector dans la bande supérieure
// ═══════════════════════════════════════════════════════════════

// 1. IMPORTS à ajouter en haut du fichier
import CountrySelector, { Country } from '@/app/components/CountrySelector';
// (ou chemin relatif selon ta structure)
// import CountrySelector, { Country } from '../components/CountrySelector';

// 2. STATE à ajouter dans le composant HomePage
const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

// 3. FILTRE à ajouter dans la logique de filtrage des vidéos
// (à intégrer dans ton useMemo ou ta fonction de filtrage existante)
const filteredVideos = videos.filter((video) => {
  // ... tes filtres existants (discipline, search…) …
  const matchCountry = !selectedCountry || video.country === selectedCountry.code;
  return matchCountry; // combine avec tes autres conditions
});
// Note : si ta table `videos` n'a pas encore de colonne `country`,
// ajoute-la : ALTER TABLE public.videos ADD COLUMN country varchar(2);

// 4. TOPBAR — remplace (ou complète) ton topbar actuel par :
/*
<header className="home-topbar">
  <div className="home-topbar-inner">

    {/* Logo *}
    <a href="/" className="home-logo">
      <span style={{ color: '#FFAA00' }}>Diki</span>
      <span style={{ color: '#fff' }}>-</span>
      <span style={{ color: '#FFAA00' }}>Diki</span>
      <span className="home-logo-badge">LIVE</span>
    </a>

    {/* ★ Country Selector — bande supérieure *}
    <CountrySelector
      selected={selectedCountry}
      onSelect={setSelectedCountry}
    />

    {/* Liens nav droite *}
    <nav className="home-topbar-nav">
      <a href="/auth/login">Connexion</a>
      <a href="/auth/register" className="btn-primary">S'inscrire</a>
    </nav>

  </div>
</header>
*/

// 5. CSS à ajouter dans home.css (ou ton fichier de styles)
/*
.home-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(8, 8, 15, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 170, 0, 0.12);
}

.home-topbar-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.home-logo {
  font-family: 'Syne', sans-serif;
  font-size: 22px;
  font-weight: 800;
  text-decoration: none;
  flex-shrink: 0;
}

.home-logo-badge {
  display: inline-block;
  background: #fff;
  color: #08080f;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 5px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: top;
  margin-top: 4px;
}

.home-topbar-nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}
.home-topbar-nav a {
  color: rgba(255,255,255,0.7);
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s;
}
.home-topbar-nav a:hover { color: #fff; }
.home-topbar-nav .btn-primary {
  background: #FFAA00;
  color: #08080f;
  padding: 8px 18px;
  border-radius: 20px;
  font-weight: 600;
}
.home-topbar-nav .btn-primary:hover {
  background: #FF6B00;
}
*/

// 6. BACKEND — route optionnelle pour filtrer par pays
// GET /v1/videos/approved?country=CI
// Dans videoController, ajouter :
/*
const { country } = req.query;
let query = supabase.from('videos').select('*').eq('status', 'approved');
if (country) query = query.eq('country', country);
*/