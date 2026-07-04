import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import type { ReactNode } from 'react'
import type { UserRole } from '@/lib/api'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
  fallbackTo?: string
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
  fallbackTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to={redirectTo} replace />

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackTo} replace />
  }

  return <>{children}</>
}
