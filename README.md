# 🏆 Diki-Diki

Plateforme de compétitions artistiques africaines avec vote Mobile Money en temps réel.

## Disciplines
💃 Danse · 🎤 Chant · 🎸 Instrument · 🎙️ Acapella · 😂 Humour · 📜 Poésie

## Types de compétition
- **Duo** : 2 participants, chacun avec sa vidéo
- **Groupe** : jusqu'à 4 groupes × 4 membres

## Stack
| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 + TypeScript + Tailwind |
| Backend | Node.js + Express + TypeScript |
| Base de données | Supabase (PostgreSQL + Realtime + Auth + Storage) |
| Paiement | CinetPay (Orange Money, Wave, MTN, Moov, Celtiis) |
| SMS | Africa's Talking |
| Push | Firebase FCM |
| Deploy Frontend | Vercel |
| Deploy Backend | Railway |
| CDN | Cloudflare |

## Installation rapide

```bash
# 1. Cloner
git clone https://github.com/votre-org/dkdk.git
cd dkdk

# 2. Backend
cd backend
npm install
cp .env.example .env   # Remplir les variables
npm run dev            # http://localhost:4000

# 3. Frontend (autre terminal)
cd frontend
npm install
cp .env.example .env.local   # Remplir les variables
npm run dev                   # http://localhost:3000

# 4. Base de données
# Coller supabase/migrations/001_pac_schema.sql dans Supabase SQL Editor
```

## Structure du projet

```
dkdk/
├── backend/
│   ├── src/
│   │   ├── controllers/     Logique métier
│   │   ├── middleware/      Auth JWT, erreurs, rate-limit
│   │   ├── routes/          Endpoints API REST
│   │   ├── services/        Vote, paiement, vidéo, SMS, notifications
│   │   └── utils/           Helpers
│   ├── config/              Supabase, Redis, Firebase
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── auth/            Connexion + inscription
│   │   ├── contests/        Liste des compétitions
│   │   ├── vote/            Page de vote avec pouces animés
│   │   ├── submit/          Dépôt vidéo (3 étapes)
│   │   ├── profile/         Profil candidat + score live
│   │   ├── recharge/        Recharge Mobile Money
│   │   ├── notifications/   Centre de notifications
│   │   └── moderation/      Panel admin modération vidéos
│   ├── components/          Composants réutilisables
│   ├── lib/                 API client, Supabase client
│   └── package.json
├── supabase/
│   └── migrations/          Schéma SQL complet
├── .github/
│   └── workflows/           CI/CD GitHub Actions
└── docs/                    Documentation technique
```

## Modèle économique
- Participation : **GRATUITE**
- Vote : **100 F CFA** débité du compte participatif
- PAC prélève **50%** sur chaque vote
- Répartition finale : **1er = 80%** · **2e = 20%** de la cagnotte nette
- Compte participatif : rechargeable via Mobile Money, n'expire jamais

## Routes API principales

```
POST   /v1/auth/send-otp          Envoyer OTP SMS
POST   /v1/auth/verify-otp        Vérifier OTP
POST   /v1/auth/register          Créer compte
POST   /v1/auth/login             Connexion

GET    /v1/contests               Lister compétitions
GET    /v1/contests/:id           Détails + classement
POST   /v1/contests               Créer (admin)

POST   /v1/votes                  Voter (Duo ou Groupe)
GET    /v1/votes/check/:contestId Déjà voté ?
GET    /v1/votes/ranking/:id      Classement live

POST   /v1/videos/upload          Déposer vidéo
GET    /v1/videos/my              Mes vidéos
PUT    /v1/videos/:id/moderate    Valider/Refuser (admin)

POST   /v1/groups                 Créer groupe
POST   /v1/groups/:id/join        Rejoindre groupe
PUT    /v1/groups/:id/video       Soumettre vidéo groupe

GET    /v1/wallet                 Solde + historique
POST   /v1/payment/initiate       Recharge Mobile Money
POST   /v1/payment/webhook        Confirmation paiement

GET    /v1/notifications          Mes notifications
PUT    /v1/notifications/read-all Tout marquer lu

GET    /v1/stats                  Stats globales (admin)
```

## Déploiement

```bash
# Backend → Railway
cd backend && railway up

# Frontend → Vercel
cd frontend && vercel --prod
```

## Licence
© 2025 Diki-Diki. Tous droits réservés.
