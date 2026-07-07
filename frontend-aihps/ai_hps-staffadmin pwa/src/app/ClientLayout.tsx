'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

const PUBLIC_PATHS = ['/staff-login', '/landing', '/forgot-password'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (!isAuthenticated && !isPublic) {
      router.replace('/staff-login');
    }
  }, [isAuthenticated, pathname, router, hydrated]);

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (!hydrated && !isPublic) return null;
  if (hydrated && !isAuthenticated && !isPublic) return null;

  return <>{children}</>;
}
