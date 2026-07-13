// backend/config/r2.ts
/*DKDK_R2*/
// Client Cloudflare R2 (compatible S3).
// R2 ne facture PAS l'egress : les videos peuvent etre vues sans limite.
import { S3Client } from '@aws-sdk/client-s3';

const manquantes: string[] = [];
if (!process.env.R2_ENDPOINT)          manquantes.push('R2_ENDPOINT');
if (!process.env.R2_ACCESS_KEY_ID)     manquantes.push('R2_ACCESS_KEY_ID');
if (!process.env.R2_SECRET_ACCESS_KEY) manquantes.push('R2_SECRET_ACCESS_KEY');
if (!process.env.R2_BUCKET)            manquantes.push('R2_BUCKET');

if (manquantes.length > 0) {
  throw new Error('Variables R2 manquantes : ' + manquantes.join(', '));
}

export const R2_BUCKET = process.env.R2_BUCKET as string;

export const r2 = new S3Client({
  region: 'auto',                       // R2 n'utilise pas de region S3
  endpoint: process.env.R2_ENDPOINT as string,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});
