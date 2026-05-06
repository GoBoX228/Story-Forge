import Script from 'next/script';
import Image from 'next/image';
import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://storyforge.example';
const gaId = process.env.NEXT_PUBLIC_GA_ID;
const yandexMetrikaId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Story Forge — онлайн-конструктор сценариев для RPG',
    template: '%s | Story Forge'
  },
  description:
    'Story Forge: онлайн-конструктор сценариев для настольных RPG с редактором карт, базой персонажей и инструментами ведения кампаний.',
  keywords: [
    'онлайн конструктор сценариев',
    'настольные RPG',
    'редактор карт',
    'генератор персонажей',
    'story forge'
  ],
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: '/',
    siteName: 'Story Forge',
    title: 'Story Forge — онлайн-конструктор сценариев для RPG',
    description:
      'Создавайте сюжеты, карты и персонажей для настольных RPG в одном рабочем пространстве.'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Story Forge — онлайн-конструктор сценариев для RPG',
    description:
      'Сервис для мастеров настольных RPG: сценарии, карты, персонажи и кампании в одном месте.'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1
    }
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" data-theme="oled">
      <body>
        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
            </Script>
          </>
        ) : null}

        {yandexMetrikaId ? (
          <>
            <Script id="yandex-metrika" strategy="afterInteractive">
              {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${yandexMetrikaId}, "init", {
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  webvisor: true
});`}
            </Script>
            <noscript>
              <div>
                <Image
                  src={`https://mc.yandex.ru/watch/${yandexMetrikaId}`}
                  width={1}
                  height={1}
                  unoptimized
                  style={{ position: 'absolute', left: '-9999px' }}
                  alt=""
                />
              </div>
            </noscript>
          </>
        ) : null}

        {children}
      </body>
    </html>
  );
}
