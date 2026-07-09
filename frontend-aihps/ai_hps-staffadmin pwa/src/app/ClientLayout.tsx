'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

const PUBLIC_PATHS = ['/staff-login', '/landing', '/forgot-password'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (!isAuthenticated && !isPublic) {
      router.replace('/staff-login');
      return;
    }
    const adminOnly = ['/analytics', '/audit', '/staff', '/patients', '/ai-monitor'];
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'department_admin';
    if (isAuthenticated && !isAdmin && adminOnly.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      router.replace('/');
    }
  }, [isAuthenticated, pathname, router, hydrated, user?.role]);

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (!hydrated && !isPublic) return null;
  if (hydrated && !isAuthenticated && !isPublic) return null;

  return <>{children}</>;
}
