import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/lib/api'

const STAFF_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'department_admin',
  'department_head',
  'doctor',
  'clinician',
  'nurse',
  'pharmacist',
  'lab_technician',
  'radiologist',
  'infection_control_officer',
  'staff',
]

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  isStaff: () => boolean
  isAdmin: () => boolean
  isPatient: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('aihps_token', token)
        set({ user, token, isAuthenticated: true })
      },
      clearAuth: () => {
        localStorage.removeItem('aihps_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
      isStaff: () => {
        const role = get().user?.role
        return role ? STAFF_ROLES.includes(role) : false
      },
      isAdmin: () => {
        const role = get().user?.role
        return role === 'super_admin' || role === 'admin'
      },
      isPatient: () => get().user?.role === 'patient',
    }),
    {
      name: 'aihps-staff-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
)
