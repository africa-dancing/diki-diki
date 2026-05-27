# GitHub Secrets — Configuration CI/CD

Aller dans votre repo GitHub → **Settings → Secrets and variables → Actions**
puis créer chacun de ces secrets :

## Secrets requis

| Secret | Description | Où le trouver |
|--------|-------------|---------------|
| `SUPABASE_URL` | URL du projet Supabase | Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Clé publique Supabase | Settings → API → anon public |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase | Settings → API → service_role |
| `RAILWAY_TOKEN` | Token de déploiement Railway | railway.app → Account → Tokens |
| `VERCEL_TOKEN` | Token Vercel | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | ID organisation Vercel | `vercel env ls` en CLI |
| `VERCEL_PROJECT_ID` | ID projet Vercel | `vercel env ls` en CLI |

## Récupérer les IDs Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Dans le dossier frontend/
cd frontend
vercel link   # Crée le projet et affiche les IDs
```

## Récupérer le token Railway

```bash
# Installer Railway CLI
npm i -g @railway/cli

# Se connecter
railway login

# Créer un token
railway tokens create pac-deploy
```

## Test du pipeline

Après configuration, pousser sur la branche `main` :
```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
```

Le pipeline GitHub Actions va automatiquement :
1. Linter et tester le backend
2. Builder le frontend
3. Déployer le backend sur Railway
4. Déployer le frontend sur Vercel
