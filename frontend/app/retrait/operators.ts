// ────────────────────────────────────────────────────────────────────────────
// TABLE DE RÉFÉRENCE — pays / opérateurs Mobile Money / prestataire de paiement
//
// Règle de routage : FedaPay pour les marchés francophones qu'il couvre
// (Bénin, Côte d'Ivoire, Togo, Burkina, Sénégal, Guinée) ; PawaPay pour tous
// les autres marchés africains. Le champ `provider` de chaque pays le dit.
//
// `enabled` = le retrait est réellement actif pour ce pays. Aujourd'hui seul le
// Bénin est actif (FedaPay validé en prod). Les autres pays s'affichent en
// APERÇU (opérateurs + logos visibles) mais le retrait est marqué « bientôt »
// tant que le prestataire correspondant n'est pas branché et testé.
//
// La correspondance (pays, opérateur) → code prestataire est faite CÔTÉ BACKEND
// (_fedaMode pour FedaPay, correspondents PawaPay). Le frontend envoie seulement
// { country, operator } ; il n'a pas besoin de connaître les codes techniques.
// ────────────────────────────────────────────────────────────────────────────

export type Provider = 'fedapay' | 'pawapay';

export interface Brand {
  label: string;
  bg: string;   // couleur de marque (fond de la carte)
  fg: string;   // couleur du texte
}

// Identité visuelle par opérateur (couleurs de marque approximatives, à affiner).
export const BRANDS: Record<string, Brand> = {
  mtn:        { label: 'MTN MoMo',       bg: '#FFCC00', fg: '#12126E' },
  moov:       { label: 'Moov Money',     bg: '#F58220', fg: '#ffffff' },
  orange:     { label: 'Orange Money',   bg: '#FF7900', fg: '#ffffff' },
  wave:       { label: 'Wave',           bg: '#12B5E5', fg: '#ffffff' },
  celtiis:    { label: 'Celtiis Cash',   bg: '#E2001A', fg: '#ffffff' },
  tmoney:     { label: 'T-Money',        bg: '#C8102E', fg: '#ffffff' },
  free:       { label: 'Free Money',     bg: '#CD1C2A', fg: '#ffffff' },
  mpesa:      { label: 'M-Pesa',         bg: '#43B02A', fg: '#ffffff' },
  airtel:     { label: 'Airtel Money',   bg: '#ED1C24', fg: '#ffffff' },
  vodacom:    { label: 'Vodacom M-Pesa', bg: '#E60000', fg: '#ffffff' },
  vodafone:   { label: 'Vodafone Cash',  bg: '#E60000', fg: '#ffffff' },
  airteltigo: { label: 'AirtelTigo',     bg: '#0033A0', fg: '#ffffff' },
  tnm:        { label: 'TNM Mpamba',     bg: '#F58220', fg: '#ffffff' },
  movitel:    { label: 'Movitel',        bg: '#E4002B', fg: '#ffffff' },
  tigo:       { label: 'Tigo Pesa',      bg: '#00539F', fg: '#ffffff' },
  halotel:    { label: 'Halotel',        bg: '#E4002B', fg: '#ffffff' },
  zamtel:     { label: 'Zamtel',         bg: '#009639', fg: '#ffffff' },
};

export interface CountryConf {
  iso: string;         // ISO2 (sert d'identifiant pays envoyé au backend)
  name: string;
  flag: string;        // emoji drapeau
  prefix: string;      // indicatif international
  currency: string;    // devise locale
  provider: Provider;  // prestataire qui route ce pays
  enabled: boolean;    // retrait réellement actif ?
  operators: string[]; // ids d'opérateurs (clés de BRANDS)
}

export const COUNTRIES: CountryConf[] = [
  // ─── FedaPay — marchés francophones couverts ──────────────────────────────
  { iso:'BJ', name:'Bénin',            flag:'🇧🇯', prefix:'+229', currency:'XOF', provider:'fedapay', enabled:true,  operators:['mtn','moov','celtiis'] },
  { iso:'CI', name:"Côte d'Ivoire",    flag:'🇨🇮', prefix:'+225', currency:'XOF', provider:'fedapay', enabled:true,  operators:['mtn','moov','orange','wave'] },
  { iso:'TG', name:'Togo',             flag:'🇹🇬', prefix:'+228', currency:'XOF', provider:'fedapay', enabled:true,  operators:['moov','tmoney'] },
  { iso:'BF', name:'Burkina Faso',     flag:'🇧🇫', prefix:'+226', currency:'XOF', provider:'fedapay', enabled:true,  operators:['orange','moov'] },
  { iso:'SN', name:'Sénégal',          flag:'🇸🇳', prefix:'+221', currency:'XOF', provider:'fedapay', enabled:true,  operators:['orange','wave'] },
  { iso:'GN', name:'Guinée',           flag:'🇬🇳', prefix:'+224', currency:'GNF', provider:'fedapay', enabled:false, operators:['mtn'] },

  // ─── PawaPay — tous les autres marchés ────────────────────────────────────
  { iso:'CM', name:'Cameroun',         flag:'🇨🇲', prefix:'+237', currency:'XAF', provider:'pawapay', enabled:false, operators:['mtn','orange'] },
  { iso:'CD', name:'RD Congo',         flag:'🇨🇩', prefix:'+243', currency:'CDF', provider:'pawapay', enabled:false, operators:['vodacom','airtel','orange'] },
  { iso:'ET', name:'Éthiopie',         flag:'🇪🇹', prefix:'+251', currency:'ETB', provider:'pawapay', enabled:false, operators:['mpesa'] },
  { iso:'GA', name:'Gabon',            flag:'🇬🇦', prefix:'+241', currency:'XAF', provider:'pawapay', enabled:false, operators:['airtel'] },
  { iso:'GH', name:'Ghana',            flag:'🇬🇭', prefix:'+233', currency:'GHS', provider:'pawapay', enabled:false, operators:['mtn','airteltigo','vodafone'] },
  { iso:'KE', name:'Kenya',            flag:'🇰🇪', prefix:'+254', currency:'KES', provider:'pawapay', enabled:false, operators:['mpesa'] },
  { iso:'LS', name:'Lesotho',          flag:'🇱🇸', prefix:'+266', currency:'LSL', provider:'pawapay', enabled:false, operators:['mpesa'] },
  { iso:'MW', name:'Malawi',           flag:'🇲🇼', prefix:'+265', currency:'MWK', provider:'pawapay', enabled:false, operators:['airtel','tnm'] },
  { iso:'MZ', name:'Mozambique',       flag:'🇲🇿', prefix:'+258', currency:'MZN', provider:'pawapay', enabled:false, operators:['movitel','vodacom'] },
  { iso:'NG', name:'Nigeria',          flag:'🇳🇬', prefix:'+234', currency:'NGN', provider:'pawapay', enabled:false, operators:['mtn','airtel'] },
  { iso:'CG', name:'Congo-Brazzaville',flag:'🇨🇬', prefix:'+242', currency:'XAF', provider:'pawapay', enabled:false, operators:['mtn','airtel'] },
  { iso:'RW', name:'Rwanda',           flag:'🇷🇼', prefix:'+250', currency:'RWF', provider:'pawapay', enabled:false, operators:['mtn','airtel'] },
  { iso:'SL', name:'Sierra Leone',     flag:'🇸🇱', prefix:'+232', currency:'SLE', provider:'pawapay', enabled:false, operators:['orange'] },
  { iso:'TZ', name:'Tanzanie',         flag:'🇹🇿', prefix:'+255', currency:'TZS', provider:'pawapay', enabled:false, operators:['airtel','vodacom','tigo','halotel'] },
  { iso:'UG', name:'Ouganda',          flag:'🇺🇬', prefix:'+256', currency:'UGX', provider:'pawapay', enabled:false, operators:['airtel','mtn'] },
  { iso:'ZM', name:'Zambie',           flag:'🇿🇲', prefix:'+260', currency:'ZMW', provider:'pawapay', enabled:false, operators:['airtel','mtn','zamtel'] },
];

export function getCountry(iso: string): CountryConf | undefined {
  return COUNTRIES.find(c => c.iso === iso);
}

// Détecte le pays à partir d'un numéro (indicatif le plus long d'abord).
export function detectCountry(phone: string): CountryConf | null {
  const digits = (phone || '').replace(/[^0-9+]/g, '');
  if (!digits.startsWith('+')) return null;
  const sorted = [...COUNTRIES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const c of sorted) if (digits.startsWith(c.prefix)) return c;
  return null;
}
