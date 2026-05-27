// Utilitaire de devise par zone géographique

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rate: number; // taux par rapport au XOF (franc CFA)
  locale: string;
}

// Taux approximatifs (à connecter à une API temps réel en production)
export const CURRENCIES: Record<string, CurrencyConfig> = {
  XOF: { code: 'XOF', symbol: 'F CFA', name: 'Franc CFA (UEMOA)', rate: 1,        locale: 'fr-CI' },
  XAF: { code: 'XAF', symbol: 'FCFA',  name: 'Franc CFA (CEMAC)', rate: 1,        locale: 'fr-CM' },
  EUR: { code: 'EUR', symbol: '€',      name: 'Euro',              rate: 0.00152,   locale: 'fr-FR' },
  USD: { code: 'USD', symbol: '$',      name: 'Dollar américain',  rate: 0.00164,   locale: 'en-US' },
  GBP: { code: 'GBP', symbol: '£',      name: 'Livre sterling',    rate: 0.00130,   locale: 'en-GB' },
  GHS: { code: 'GHS', symbol: 'GH₵',   name: 'Cedi ghanéen',      rate: 0.026,     locale: 'en-GH' },
  NGN: { code: 'NGN', symbol: '₦',      name: 'Naira nigérian',    rate: 2.50,      locale: 'en-NG' },
  MAD: { code: 'MAD', symbol: 'DH',     name: 'Dirham marocain',   rate: 0.0165,    locale: 'fr-MA' },
  DZD: { code: 'DZD', symbol: 'DA',     name: 'Dinar algérien',    rate: 0.221,     locale: 'fr-DZ' },
  TND: { code: 'TND', symbol: 'DT',     name: 'Dinar tunisien',    rate: 0.00505,   locale: 'fr-TN' },
  CMR: { code: 'XAF', symbol: 'FCFA',   name: 'Franc CFA Cameroun',rate: 1,         locale: 'fr-CM' },
  CAD: { code: 'CAD', symbol: 'CA$',    name: 'Dollar canadien',   rate: 0.00222,   locale: 'fr-CA' },
  CFA: { code: 'XOF', symbol: 'F CFA',  name: 'Franc CFA',         rate: 1,         locale: 'fr-SN' },
};

// Correspondance pays → devise
export const COUNTRY_CURRENCY: Record<string, string> = {
  CI: 'XOF', SN: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', GW: 'XOF', TG: 'XOF', BJ: 'XOF',
  CM: 'XAF', TD: 'XAF', CF: 'XAF', CG: 'XAF', GA: 'XAF', GQ: 'XAF',
  FR: 'EUR', DE: 'EUR', BE: 'EUR', LU: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR',
  US: 'USD', CA: 'CAD', GB: 'GBP',
  GH: 'GHS', NG: 'NGN', MA: 'MAD', DZ: 'DZD', TN: 'TND',
};

// Convertit un montant XOF vers la devise cible
export function convertAmount(xofAmount: number, currency: CurrencyConfig): number {
  const converted = xofAmount * currency.rate;
  if (currency.code === 'XOF' || currency.code === 'XAF') return Math.round(converted);
  if (converted < 1) return Math.round(converted * 100) / 100;
  return Math.round(converted * 10) / 10;
}

// Formate un montant avec le symbole de la devise
export function formatAmount(xofAmount: number, currency: CurrencyConfig): string {
  const converted = convertAmount(xofAmount, currency);
  if (currency.code === 'XOF' || currency.code === 'XAF') {
    if (converted >= 1000) return `${(converted / 1000).toFixed(converted % 1000 === 0 ? 0 : 1)}k ${currency.symbol}`;
    return `${converted} ${currency.symbol}`;
  }
  if (converted >= 1000) return `${currency.symbol}${(converted / 1000).toFixed(1)}k`;
  return `${currency.symbol}${converted}`;
}

// Détecte la devise à partir du code pays
export function getCurrencyFromCountry(countryCode: string): CurrencyConfig {
  const code = COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? 'XOF';
  return CURRENCIES[code] ?? CURRENCIES['XOF'];
}

// Détecte automatiquement depuis le navigateur (langue/fuseau)
export function detectCurrency(): CurrencyConfig {
  if (typeof window === 'undefined') return CURRENCIES['XOF'];
  const lang = navigator.language ?? 'fr';
  const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';

  // Détection par fuseau horaire
  if (tz.includes('Paris') || tz.includes('Europe')) return CURRENCIES['EUR'];
  if (tz.includes('London'))                           return CURRENCIES['GBP'];
  if (tz.includes('New_York') || tz.includes('America/Chicago') || tz.includes('America/Los_Angeles')) return CURRENCIES['USD'];
  if (tz.includes('Toronto') || tz.includes('Vancouver')) return CURRENCIES['CAD'];
  if (tz.includes('Lagos'))                            return CURRENCIES['NGN'];
  if (tz.includes('Accra') || tz.includes('Abidjan') || tz.includes('Dakar') || tz.includes('Bamako')) return CURRENCIES['XOF'];
  if (tz.includes('Douala') || tz.includes('Libreville')) return CURRENCIES['XAF'];
  if (tz.includes('Casablanca') || tz.includes('Rabat')) return CURRENCIES['MAD'];
  if (tz.includes('Algiers'))                          return CURRENCIES['DZD'];
  if (tz.includes('Tunis'))                            return CURRENCIES['TND'];

  // Fallback par langue
  if (lang.startsWith('en-US')) return CURRENCIES['USD'];
  if (lang.startsWith('en-GB')) return CURRENCIES['GBP'];
  if (lang.startsWith('fr-FR') || lang.startsWith('fr-BE')) return CURRENCIES['EUR'];

  return CURRENCIES['XOF'];
}