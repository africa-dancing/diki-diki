#!/bin/bash
# ═══════════════════════════════════════════════════
# Diki-Diki — Script de démarrage rapide
# Usage : bash setup.sh
# ═══════════════════════════════════════════════════

set -e

echo ""
echo "🏆 Diki-Diki — Setup"
echo "════════════════════════════════════"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js non installé. Installez Node.js 20+ depuis https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Backend
echo ""
echo "📦 Installation backend..."
cd backend
npm install
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Fichier backend/.env créé — remplissez les variables avant de continuer"
fi
cd ..

# Frontend
echo ""
echo "📦 Installation frontend..."
cd frontend
npm install
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "⚠️  Fichier frontend/.env.local créé — remplissez les variables avant de continuer"
fi
cd ..

echo ""
echo "════════════════════════════════════"
echo "✅ Installation terminée !"
echo ""
echo "Prochaines étapes :"
echo "  1. Remplir backend/.env"
echo "  2. Remplir frontend/.env.local"
echo "  3. Exécuter supabase/migrations/001_dkdk_schema.sql dans Supabase SQL Editor"
echo ""
echo "Démarrer :"
echo "  Terminal 1 : cd backend  && npm run dev"
echo "  Terminal 2 : cd frontend && npm run dev"
echo ""
echo "  Backend  → http://localhost:4000/health"
echo "  Frontend → http://localhost:3001"
echo ""