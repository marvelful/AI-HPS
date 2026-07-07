import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import Providers from './providers';
import ClientLayout from './ClientLayout';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'AI-HPS — Clinical Intelligence, Delivered Safely',
  description: 'AI-powered Hospital Procedure System for Hôpital Général de Douala — clinical knowledge management and AI monitoring for authorized staff.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className={inter.className}>
        <Providers>
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}