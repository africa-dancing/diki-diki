'use client';

import { useState, useRef, useEffect } from 'react';
import './CountrySelector.css';

export type Region = 'Tous' | 'Afrique' | 'Europe' | 'Amériques' | 'Asie' | 'Océanie';

export interface Country {
  code: string;
  name: string;
  region: Exclude<Region, 'Tous'>;
}

export const COUNTRIES: Country[] = [
  // ── AFRIQUE ──
  { code: 'DZ', name: 'Algérie',               region: 'Afrique' },
  { code: 'AO', name: 'Angola',                region: 'Afrique' },
  { code: 'BJ', name: 'Bénin',                 region: 'Afrique' },
  { code: 'BW', name: 'Botswana',              region: 'Afrique' },
  { code: 'BF', name: 'Burkina Faso',          region: 'Afrique' },
  { code: 'BI', name: 'Burundi',               region: 'Afrique' },
  { code: 'CV', name: 'Cap-Vert',              region: 'Afrique' },
  { code: 'CM', name: 'Cameroun',              region: 'Afrique' },
  { code: 'CF', name: 'Centrafrique',          region: 'Afrique' },
  { code: 'KM', name: 'Comores',               region: 'Afrique' },
  { code: 'CG', name: 'Congo',                 region: 'Afrique' },
  { code: 'CD', name: 'Congo (RDC)',           region: 'Afrique' },
  { code: 'CI', name: "Côte d'Ivoire",         region: 'Afrique' },
  { code: 'DJ', name: 'Djibouti',              region: 'Afrique' },
  { code: 'EG', name: 'Égypte',                region: 'Afrique' },
  { code: 'ER', name: 'Érythrée',              region: 'Afrique' },
  { code: 'ET', name: 'Éthiopie',              region: 'Afrique' },
  { code: 'GA', name: 'Gabon',                 region: 'Afrique' },
  { code: 'GM', name: 'Gambie',                region: 'Afrique' },
  { code: 'GH', name: 'Ghana',                 region: 'Afrique' },
  { code: 'GN', name: 'Guinée',                region: 'Afrique' },
  { code: 'GW', name: 'Guinée-Bissau',         region: 'Afrique' },
  { code: 'GQ', name: 'Guinée équatoriale',    region: 'Afrique' },
  { code: 'KE', name: 'Kenya',                 region: 'Afrique' },
  { code: 'LS', name: 'Lesotho',               region: 'Afrique' },
  { code: 'LR', name: 'Liberia',               region: 'Afrique' },
  { code: 'LY', name: 'Libye',                 region: 'Afrique' },
  { code: 'MG', name: 'Madagascar',            region: 'Afrique' },
  { code: 'MW', name: 'Malawi',                region: 'Afrique' },
  { code: 'ML', name: 'Mali',                  region: 'Afrique' },
  { code: 'MA', name: 'Maroc',                 region: 'Afrique' },
  { code: 'MR', name: 'Mauritanie',            region: 'Afrique' },
  { code: 'MU', name: 'Maurice',               region: 'Afrique' },
  { code: 'MZ', name: 'Mozambique',            region: 'Afrique' },
  { code: 'NA', name: 'Namibie',               region: 'Afrique' },
  { code: 'NE', name: 'Niger',                 region: 'Afrique' },
  { code: 'NG', name: 'Nigeria',               region: 'Afrique' },
  { code: 'UG', name: 'Ouganda',               region: 'Afrique' },
  { code: 'RW', name: 'Rwanda',                region: 'Afrique' },
  { code: 'ST', name: 'Sao Tomé-et-Principe', region: 'Afrique' },
  { code: 'SN', name: 'Sénégal',              region: 'Afrique' },
  { code: 'SC', name: 'Seychelles',            region: 'Afrique' },
  { code: 'SL', name: 'Sierra Leone',          region: 'Afrique' },
  { code: 'SO', name: 'Somalie',               region: 'Afrique' },
  { code: 'SD', name: 'Soudan',                region: 'Afrique' },
  { code: 'SS', name: 'Soudan du Sud',         region: 'Afrique' },
  { code: 'SZ', name: 'Eswatini',              region: 'Afrique' },
  { code: 'TZ', name: 'Tanzanie',              region: 'Afrique' },
  { code: 'TD', name: 'Tchad',                 region: 'Afrique' },
  { code: 'TG', name: 'Togo',                  region: 'Afrique' },
  { code: 'TN', name: 'Tunisie',               region: 'Afrique' },
  { code: 'ZM', name: 'Zambie',                region: 'Afrique' },
  { code: 'ZW', name: 'Zimbabwe',              region: 'Afrique' },
  { code: 'ZA', name: 'Afrique du Sud',        region: 'Afrique' },
  // ── EUROPE ──
  { code: 'AL', name: 'Albanie',               region: 'Europe' },
  { code: 'AD', name: 'Andorre',               region: 'Europe' },
  { code: 'AM', name: 'Arménie',               region: 'Europe' },
  { code: 'AT', name: 'Autriche',              region: 'Europe' },
  { code: 'AZ', name: 'Azerbaïdjan',           region: 'Europe' },
  { code: 'BE', name: 'Belgique',              region: 'Europe' },
  { code: 'BY', name: 'Biélorussie',           region: 'Europe' },
  { code: 'BA', name: 'Bosnie-Herzégovine',    region: 'Europe' },
  { code: 'BG', name: 'Bulgarie',              region: 'Europe' },
  { code: 'HR', name: 'Croatie',               region: 'Europe' },
  { code: 'CY', name: 'Chypre',                region: 'Europe' },
  { code: 'CZ', name: 'Tchéquie',              region: 'Europe' },
  { code: 'DK', name: 'Danemark',              region: 'Europe' },
  { code: 'EE', name: 'Estonie',               region: 'Europe' },
  { code: 'FI', name: 'Finlande',              region: 'Europe' },
  { code: 'FR', name: 'France',                region: 'Europe' },
  { code: 'GE', name: 'Géorgie',               region: 'Europe' },
  { code: 'DE', name: 'Allemagne',             region: 'Europe' },
  { code: 'GR', name: 'Grèce',                 region: 'Europe' },
  { code: 'HU', name: 'Hongrie',               region: 'Europe' },
  { code: 'IS', name: 'Islande',               region: 'Europe' },
  { code: 'IE', name: 'Irlande',               region: 'Europe' },
  { code: 'IT', name: 'Italie',                region: 'Europe' },
  { code: 'XK', name: 'Kosovo',                region: 'Europe' },
  { code: 'LV', name: 'Lettonie',              region: 'Europe' },
  { code: 'LI', name: 'Liechtenstein',         region: 'Europe' },
  { code: 'LT', name: 'Lituanie',              region: 'Europe' },
  { code: 'LU', name: 'Luxembourg',            region: 'Europe' },
  { code: 'MT', name: 'Malte',                 region: 'Europe' },
  { code: 'MD', name: 'Moldavie',              region: 'Europe' },
  { code: 'MC', name: 'Monaco',                region: 'Europe' },
  { code: 'ME', name: 'Monténégro',            region: 'Europe' },
  { code: 'MK', name: 'Macédoine du Nord',     region: 'Europe' },
  { code: 'NO', name: 'Norvège',               region: 'Europe' },
  { code: 'NL', name: 'Pays-Bas',              region: 'Europe' },
  { code: 'PL', name: 'Pologne',               region: 'Europe' },
  { code: 'PT', name: 'Portugal',              region: 'Europe' },
  { code: 'RO', name: 'Roumanie',              region: 'Europe' },
  { code: 'RU', name: 'Russie',                region: 'Europe' },
  { code: 'SM', name: 'Saint-Marin',           region: 'Europe' },
  { code: 'RS', name: 'Serbie',                region: 'Europe' },
  { code: 'SK', name: 'Slovaquie',             region: 'Europe' },
  { code: 'SI', name: 'Slovénie',              region: 'Europe' },
  { code: 'ES', name: 'Espagne',               region: 'Europe' },
  { code: 'SE', name: 'Suède',                 region: 'Europe' },
  { code: 'CH', name: 'Suisse',                region: 'Europe' },
  { code: 'UA', name: 'Ukraine',               region: 'Europe' },
  { code: 'GB', name: 'Royaume-Uni',           region: 'Europe' },
  { code: 'VA', name: 'Vatican',               region: 'Europe' },
  // ── AMÉRIQUES ──
  { code: 'AG', name: 'Antigua-et-Barbuda',    region: 'Amériques' },
  { code: 'AR', name: 'Argentine',             region: 'Amériques' },
  { code: 'BS', name: 'Bahamas',               region: 'Amériques' },
  { code: 'BB', name: 'Barbade',               region: 'Amériques' },
  { code: 'BZ', name: 'Belize',                region: 'Amériques' },
  { code: 'BO', name: 'Bolivie',               region: 'Amériques' },
  { code: 'BR', name: 'Brésil',                region: 'Amériques' },
  { code: 'CA', name: 'Canada',                region: 'Amériques' },
  { code: 'CL', name: 'Chili',                 region: 'Amériques' },
  { code: 'CO', name: 'Colombie',              region: 'Amériques' },
  { code: 'CR', name: 'Costa Rica',            region: 'Amériques' },
  { code: 'CU', name: 'Cuba',                  region: 'Amériques' },
  { code: 'DM', name: 'Dominique',             region: 'Amériques' },
  { code: 'DO', name: 'Rép. dominicaine',      region: 'Amériques' },
  { code: 'EC', name: 'Équateur',              region: 'Amériques' },
  { code: 'SV', name: 'Salvador',              region: 'Amériques' },
  { code: 'GD', name: 'Grenade',               region: 'Amériques' },
  { code: 'GT', name: 'Guatemala',             region: 'Amériques' },
  { code: 'GY', name: 'Guyana',                region: 'Amériques' },
  { code: 'HT', name: 'Haïti',                 region: 'Amériques' },
  { code: 'HN', name: 'Honduras',              region: 'Amériques' },
  { code: 'JM', name: 'Jamaïque',              region: 'Amériques' },
  { code: 'MX', name: 'Mexique',               region: 'Amériques' },
  { code: 'NI', name: 'Nicaragua',             region: 'Amériques' },
  { code: 'PA', name: 'Panama',                region: 'Amériques' },
  { code: 'PY', name: 'Paraguay',              region: 'Amériques' },
  { code: 'PE', name: 'Pérou',                 region: 'Amériques' },
  { code: 'KN', name: 'Saint-Kitts-et-Nevis', region: 'Amériques' },
  { code: 'LC', name: 'Sainte-Lucie',          region: 'Amériques' },
  { code: 'VC', name: 'Saint-Vincent',         region: 'Amériques' },
  { code: 'SR', name: 'Suriname',              region: 'Amériques' },
  { code: 'TT', name: 'Trinité-et-Tobago',    region: 'Amériques' },
  { code: 'US', name: 'États-Unis',            region: 'Amériques' },
  { code: 'UY', name: 'Uruguay',               region: 'Amériques' },
  { code: 'VE', name: 'Venezuela',             region: 'Amériques' },
  // ── ASIE ──
  { code: 'AF', name: 'Afghanistan',           region: 'Asie' },
  { code: 'SA', name: 'Arabie saoudite',       region: 'Asie' },
  { code: 'BH', name: 'Bahreïn',              region: 'Asie' },
  { code: 'BD', name: 'Bangladesh',            region: 'Asie' },
  { code: 'BT', name: 'Bhoutan',              region: 'Asie' },
  { code: 'BN', name: 'Brunei',                region: 'Asie' },
  { code: 'KH', name: 'Cambodge',             region: 'Asie' },
  { code: 'CN', name: 'Chine',                 region: 'Asie' },
  { code: 'KP', name: 'Corée du Nord',         region: 'Asie' },
  { code: 'KR', name: 'Corée du Sud',          region: 'Asie' },
  { code: 'AE', name: 'Émirats arabes unis',  region: 'Asie' },
  { code: 'IN', name: 'Inde',                  region: 'Asie' },
  { code: 'ID', name: 'Indonésie',             region: 'Asie' },
  { code: 'IR', name: 'Iran',                  region: 'Asie' },
  { code: 'IQ', name: 'Irak',                  region: 'Asie' },
  { code: 'IL', name: 'Israël',                region: 'Asie' },
  { code: 'JP', name: 'Japon',                 region: 'Asie' },
  { code: 'JO', name: 'Jordanie',              region: 'Asie' },
  { code: 'KZ', name: 'Kazakhstan',            region: 'Asie' },
  { code: 'KW', name: 'Koweït',               region: 'Asie' },
  { code: 'KG', name: 'Kirghizistan',          region: 'Asie' },
  { code: 'LA', name: 'Laos',                  region: 'Asie' },
  { code: 'LB', name: 'Liban',                 region: 'Asie' },
  { code: 'MY', name: 'Malaisie',              region: 'Asie' },
  { code: 'MV', name: 'Maldives',              region: 'Asie' },
  { code: 'MN', name: 'Mongolie',              region: 'Asie' },
  { code: 'MM', name: 'Myanmar',               region: 'Asie' },
  { code: 'NP', name: 'Népal',                 region: 'Asie' },
  { code: 'OM', name: 'Oman',                  region: 'Asie' },
  { code: 'UZ', name: 'Ouzbékistan',           region: 'Asie' },
  { code: 'PK', name: 'Pakistan',              region: 'Asie' },
  { code: 'PS', name: 'Palestine',             region: 'Asie' },
  { code: 'PH', name: 'Philippines',           region: 'Asie' },
  { code: 'QA', name: 'Qatar',                 region: 'Asie' },
  { code: 'SY', name: 'Syrie',                 region: 'Asie' },
  { code: 'LK', name: 'Sri Lanka',             region: 'Asie' },
  { code: 'TJ', name: 'Tadjikistan',           region: 'Asie' },
  { code: 'TW', name: 'Taïwan',                region: 'Asie' },
  { code: 'TH', name: 'Thaïlande',            region: 'Asie' },
  { code: 'TL', name: 'Timor oriental',        region: 'Asie' },
  { code: 'TM', name: 'Turkménistan',          region: 'Asie' },
  { code: 'TR', name: 'Turquie',               region: 'Asie' },
  { code: 'VN', name: 'Viêt Nam',              region: 'Asie' },
  { code: 'YE', name: 'Yémen',                 region: 'Asie' },
  // ── OCÉANIE ──
  { code: 'AU', name: 'Australie',             region: 'Océanie' },
  { code: 'FJ', name: 'Fidji',                 region: 'Océanie' },
  { code: 'KI', name: 'Kiribati',              region: 'Océanie' },
  { code: 'MH', name: 'Îles Marshall',         region: 'Océanie' },
  { code: 'FM', name: 'Micronésie',            region: 'Océanie' },
  { code: 'NR', name: 'Nauru',                 region: 'Océanie' },
  { code: 'NZ', name: 'Nouvelle-Zélande',      region: 'Océanie' },
  { code: 'PW', name: 'Palaos',                region: 'Océanie' },
  { code: 'PG', name: 'Papouasie-N.-Guinée',  region: 'Océanie' },
  { code: 'WS', name: 'Samoa',                 region: 'Océanie' },
  { code: 'SB', name: 'Îles Salomon',          region: 'Océanie' },
  { code: 'TO', name: 'Tonga',                 region: 'Océanie' },
  { code: 'TV', name: 'Tuvalu',                region: 'Océanie' },
  { code: 'VU', name: 'Vanuatu',               region: 'Océanie' },
];

const REGIONS: { id: Region; label: string }[] = [
  { id: 'Tous',      label: 'Tous' },
  { id: 'Afrique',   label: 'Afrique' },
  { id: 'Europe',    label: 'Europe' },
  { id: 'Amériques', label: 'Amériques' },
  { id: 'Asie',      label: 'Asie' },
  { id: 'Océanie',   label: 'Océanie' },
];

function Flag({ code, size = 22 }: { code: string; size?: number }) {
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/${size}x${h}/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/${size * 2}x${h * 2}/${code.toLowerCase()}.png 2x`}
      width={size}
      height={h}
      alt={code}
      style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
      loading="lazy"
    />
  );
}

interface CountrySelectorProps {
  onSelect: (country: Country | null) => void;
  selected: Country | null;
}

export default function CountrySelector({ onSelect, selected }: CountrySelectorProps) {
  const [open, setOpen]     = useState(false);
  const [region, setRegion] = useState<Region>('Tous');
  const [search, setSearch] = useState('');
  const panelRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = COUNTRIES.filter(c => {
    const matchRegion = region === 'Tous' || c.region === region;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchSearch;
  });

  const handleSelect = (country: Country | null) => {
    onSelect(country);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="cs-wrapper" ref={panelRef}>
      {/* Trigger */}
      <button
        className="cs-trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {selected
          ? <Flag code={selected.code} size={20} />
          : <span className="cs-globe">🌍</span>
        }
        <span className="cs-label">{selected ? selected.name : 'Monde entier'}</span>
        <svg
          className={`cs-chevron ${open ? 'open' : ''}`}
          viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div className="cs-panel" role="dialog" aria-label="Sélecteur de pays">

          {/* Recherche */}
          <div className="cs-search-row">
            <svg className="cs-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="5.5"/><line x1="13.5" y1="13.5" x2="17" y2="17"/>
            </svg>
            <input
              className="cs-search"
              type="text"
              placeholder="Rechercher un pays…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button className="cs-clear" onClick={() => setSearch('')} aria-label="Effacer">×</button>
            )}
          </div>

          {/* Onglets régions */}
          <div className="cs-regions">
            {REGIONS.map(r => (
              <button
                key={r.id}
                className={`cs-region-tab ${region === r.id ? 'active' : ''}`}
                onClick={() => setRegion(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Monde entier */}
          {!search && (
            <button
              className={`cs-all-btn ${!selected ? 'active' : ''}`}
              onClick={() => handleSelect(null)}
            >
              <span className="cs-all-flag">🌍</span>
              <span>Monde entier</span>
              {!selected && <span className="cs-check">✓</span>}
            </button>
          )}

          {/* Grille pays avec vrais drapeaux */}
          <div className="cs-grid">
            {filtered.length === 0 ? (
              <p className="cs-empty">Aucun pays trouvé</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  className={`cs-item ${selected?.code === c.code ? 'active' : ''}`}
                  onClick={() => handleSelect(c)}
                  title={c.name}
                >
                  <Flag code={c.code} size={24} />
                  <span className="cs-name">{c.name}</span>
                  {selected?.code === c.code && <span className="cs-check">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}