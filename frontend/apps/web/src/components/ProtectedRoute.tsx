import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import type { ReactNode } from 'react'
import type { UserRole } from '@/lib/api'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to={redirectTo} replace />

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'patient' ? '/patient/home' : '/admin/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}
