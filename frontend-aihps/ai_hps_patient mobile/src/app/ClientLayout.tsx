'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

// Paths accessible without authentication
const PUBLIC_PATHS = ['/', '/sign-in', '/sign-up', '/login', '/patient-registration'];

// Auth-only public paths: redirect logged-in users away to /home
const AUTH_REDIRECT_PATHS = ['/', '/sign-in', '/sign-up'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
    const isAuthRedirect = AUTH_REDIRECT_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (isAuthenticated && isAuthRedirect) {
      router.replace('/home');
    } else if (!isAuthenticated && !isPublic) {
      router.replace('/sign-in');
    }
  }, [isAuthenticated, pathname, router, hydrated]);

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isAuthRedirect = AUTH_REDIRECT_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  // Before hydration: show public pages, hide protected ones
  if (!hydrated) return isPublic ? <>{children}</> : null;

  // After hydration: hide if we're about to redirect
  if (isAuthenticated && isAuthRedirect) return null;
  if (!isAuthenticated && !isPublic) return null;

  return <>{children}</>;
}
