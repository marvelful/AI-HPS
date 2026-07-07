import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import Providers from './providers';
import ClientLayout from './ClientLayout';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'AI-HPS Patient — Your Health Assistant at HGD',
  description:
    'AI-powered hospital companion for patients of Hôpital Général de Douala. Ask health questions, browse procedures, and navigate the hospital.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <Providers><ClientLayout>{children}</ClientLayout></Providers>
      </body>
    </html>
  );
}
