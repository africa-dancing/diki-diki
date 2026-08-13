import { Request, Response, NextFunction } from 'express';

const ERRORS: Record<string, { status: number; message: string }> = {
  INSUFFICIENT_BALANCE:    { status: 400, message: 'Solde insuffisant (min 100 F CFA)' },
  ALREADY_VOTED:           { status: 409, message: 'Vous avez déjà voté dans ce concours' },
  WRONG_COMPETITION_TYPE:  { status: 400, message: 'Type de compétition incorrect' },
  USER_NOT_FOUND:          { status: 404, message: 'Utilisateur introuvable' },
  VIDEO_NOT_FOUND:         { status: 404, message: 'Vidéo introuvable' },
  GROUP_NOT_FOUND:         { status: 404, message: 'Groupe introuvable' },
  GROUP_FULL:              { status: 400, message: 'Ce groupe est complet (max 4 membres)' },
  MAX_GROUPS_REACHED:      { status: 400, message: 'Nombre maximum de groupes atteint' },
  ALREADY_IN_GROUP:        { status: 409, message: 'Vous êtes déjà dans un groupe pour ce concours' },
  LEADER_ONLY:             { status: 403, message: 'Seul le leader peut effectuer cette action' },
  VIDEO_NOT_APPROVED:      { status: 400, message: 'La vidéo doit être validée avant inscription' },
  NOT_YOUR_VIDEO:          { status: 403, message: 'Cette vidéo ne vous appartient pas' },
  INVALID_OTP:             { status: 400, message: 'Code OTP incorrect ou expiré' },
  PAYMENT_FAILED:          { status: 402, message: 'Échec du paiement Mobile Money' },
  FILE_TOO_LARGE:          { status: 400, message: 'Fichier trop lourd (max 500 MB)' },
  INVALID_FORMAT:          { status: 400, message: 'Format non supporté (MP4 ou MOV uniquement)' },
  UPLOAD_FAILED:           { status: 500, message: 'Échec de l\'upload vidéo' },
  FORBIDDEN:               { status: 403, message: 'Action non autorisée' },
  PHONE_ALREADY_USED:      { status: 409, message: 'Ce numéro est déjà associé à un compte' },
  INVALID_CREDENTIALS:     { status: 401, message: 'Téléphone ou mot de passe incorrect' },
  AMOUNT_TOO_LOW:          { status: 400, message: 'Montant minimum : 1 000 F CFA' },
};

export function errorHandler(
  err: Error, _req: Request, res: Response, _next: NextFunction
) {
  console.error(`[ERROR] ${err.message}`);
  const known = ERRORS[err.message];
  if (known) {
    return res.status(known.status).json({
      error:   err.message,
      message: known.message,
    });
  }
  res.status(500).json({
    error:   'INTERNAL_ERROR',
    message: 'Une erreur inattendue s\'est produite',
  });
}
