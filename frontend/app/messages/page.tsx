/* DKDK_MESSAGERIE — ancienne route : redirige vers l'onglet Messagerie du Compte. */
'use client';
import { useEffect } from 'react';

export default function MessagesRedirect() {
  useEffect(() => {
    let to = '';
    try { to = new URLSearchParams(window.location.search).get('to') || ''; } catch {}
    const dest = '/compte?tab=messagerie' + (to ? '&to=' + encodeURIComponent(to) : '');
    window.location.replace(dest);
  }, []);
  return null;
}
