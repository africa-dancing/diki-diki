import './mobile.css';
import BackgroundMusic from './components/BackgroundMusic';
import SplashScreen from './components/SplashScreen'; /*DKDK_SPLASH_MOUNT*/
import type { Metadata } from 'next';
import { Inter, DM_Sans } from 'next/font/google'; /*DKDK_POLICE_INTER*/

const syne = Inter({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'Diki-Diki Vision',
  description: 'Diki-Diki Vision est le premier réseau social numérique panafricain créé pour valoriser et promouvoir les cultures africaines partout où elles existent.',
  keywords: ['talents africains', 'musique africaine', 'danse africaine', 'concours', 'Bénin', 'Afrique'],
  openGraph: {
    title: 'Diki-Diki Vision',
    description: 'Diki-Diki Vision est le premier réseau social numérique panafricain créé pour valoriser et promouvoir les cultures africaines partout où elles existent.',
    url: 'https://dikidiki.com',
    siteName: 'Diki-Diki Vision',
    locale: 'fr_BJ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Diki-Diki Vision',
    description: 'Diki-Diki Vision est le premier réseau social numérique panafricain créé pour valoriser et promouvoir les cultures africaines partout où elles existent.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${syne.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body>
        {/* Applique le thème Jour/Nuit avant le rendu pour éviter tout clignotement */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{if(localStorage.getItem('dkdk-theme')==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();" }} />
        <SplashScreen />{children}<BackgroundMusic />
      </body>
    </html>
  );
}
