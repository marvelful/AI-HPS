import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Patient {
  id: string; name: string; email: string; phone: string; dob: string;
  language: 'fr' | 'en';
  notifications?: { appointments: boolean; updates: boolean; reminders: boolean; };
}

interface AuthState {
  patient: Patient | null; token: string | null; isAuthenticated: boolean;
  login: (patient: Patient, token: string) => void;
  logout: () => void;
  updateLanguage: (lang: 'fr' | 'en') => void;
  updateProfile: (data: Partial<Patient>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      patient: null, token: null, isAuthenticated: false,
      login: (patient, token) => {
        localStorage.setItem('aihps_patient_token', token)
        set({ patient, isAuthenticated: true, token })
      },
      logout: () => {
        localStorage.removeItem('aihps_patient_token')
        set({ patient: null, isAuthenticated: false, token: null })
      },
      updateLanguage: (lang) => set(s => ({ patient: s.patient ? { ...s.patient, language: lang } : null })),
      updateProfile: (data) => set(s => ({ patient: s.patient ? { ...s.patient, ...data } : null })),
    }),
    { name: 'hgd-patient-auth' }
  )
)
