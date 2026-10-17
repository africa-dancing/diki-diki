export { default } from './challenges/appels/page'; /*DKDK_ROOT_RENDER_APPELS — l'atterrissage visiteurs se fait sur le Mur des Appels (accueil vide sans videos = friction). /home reste accessible via le menu.*/
export const revalidate = 60; /*DKDK_SSR — ISR sur l'accueil (pre-rendu du Mur des appels)*/
