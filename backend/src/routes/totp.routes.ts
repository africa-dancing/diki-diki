// backend/src/routes/totp.routes.ts
/*DKDK_TOTP*/
import { Router } from 'express';
import { setupTotp, activateTotp, verifyTotp, statusTotp } from '../controllers/totp.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Preparer / activer : reserve aux admins connectes
router.post('/setup',    requireAuth, requireAdmin, setupTotp);
router.post('/activate', requireAuth, requireAdmin, activateTotp);

// Verifier a la connexion : le mot de passe a deja ete valide (JWT present)
router.post('/verify',   requireAuth, verifyTotp);

// Statut : public, dit seulement s'il faut demander un code
router.post('/status',   statusTotp);

export default router;
