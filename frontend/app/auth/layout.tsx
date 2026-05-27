import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diki-Diki Vision — Inscription',
  description: 'La plateforme de competitions artistiques',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="auth-shell">{children}</div>;
}