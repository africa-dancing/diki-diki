// frontend/app/challenges/appels/page.tsx
// DKDK_SSR — pre-rendu (ISR) du Mur des appels : les appels ouverts sont recuperes
// cote serveur (revalidation 60 s) et passes en donnees initiales -> la page arrive
// DEJA REMPLIE (ameliore le Speed Index mobile ; plus de rendu progressif).
// Repli : si la recuperation serveur echoue (ou API_PROXY_TARGET absent), initialData=null
// et le composant bascule sur son ancien comportement (fetch cote navigateur) -> zero regression.
import MurDesAppels from './MurDesAppels';

export const revalidate = 60;

async function getInitialData() {
  const base = (process.env.API_PROXY_TARGET || '').replace(/\/+$/, '');
  if (!base) return null;
  try {
    const r = await fetch(`${base}/v1/brackets/appels`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    const d = await r.json();
    return { appels: d?.data?.appels ?? [], aggregates: d?.data?.aggregates ?? null };
  } catch {
    return null;
  }
}

export default async function Page() {
  const initialData = await getInitialData();
  return <MurDesAppels initialData={initialData} />;
}
