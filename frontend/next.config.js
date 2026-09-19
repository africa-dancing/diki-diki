/** @type {import('next').NextConfig} */

// ── SÉCURITÉ (Étape B — cookie httpOnly « first-party ») ──────────────
// Le front (diki-diki.com) et l'API (Railway) sont sur deux domaines
// différents : un cookie posé par Railway serait donc « tiers » et bloqué
// par les navigateurs. On règle ça avec un proxy : le navigateur n'appelle
// plus que /api/... sur diki-diki.com, et Next relaie vers Railway côté
// serveur. Le cookie revient alors attribué à diki-diki.com = first-party.
//
// API_PROXY_TARGET = l'origine de l'API Railway SANS /v1 ni slash final,
// ex : https://diki-diki-production.up.railway.app
// (c'est la valeur actuelle de NEXT_PUBLIC_API_URL, privée du « /v1 » final).
// Tant que cette variable n'est pas définie, AUCUNE réécriture n'est faite
// (comportement inchangé) — impossible de casser quoi que ce soit par erreur.
const API_PROXY_TARGET = (process.env.API_PROXY_TARGET || '').replace(/\/+$/, '');

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    if (!API_PROXY_TARGET) return [];
    return [
      { source: '/api/:path*', destination: `${API_PROXY_TARGET}/:path*` },
    ];
  },
};

module.exports = nextConfig;
