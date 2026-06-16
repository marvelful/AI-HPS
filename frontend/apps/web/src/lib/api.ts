import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8002'
const MOCK_MODE = import.meta.env.VITE_MOCK_AUTH === 'true'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aihps_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('aihps_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export interface LoginPayload { email: string; password: string }
export interface LoginResponse { access_token: string; token_type: string; user: User }

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department?: string
  is_active: boolean
}

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'department_head'
  | 'clinician'
  | 'nurse'
  | 'patient'

export interface RegisterPayload {
  full_name: string
  email: string
  phone?: string
  date_of_birth?: string
  password: string
  role: 'patient'
}

// ── Mock users (used when VITE_MOCK_AUTH=true) ─────────────────────────────
const MOCK_USERS: Record<string, User> = {
  'admin@hgd.cm': {
    id: 'u001', email: 'admin@hgd.cm', full_name: 'Dr. Ayuk Emmanuel',
    role: 'admin', department: 'ICU', is_active: true,
  },
  'super@hgd.cm': {
    id: 'u000', email: 'super@hgd.cm', full_name: 'System Administrator',
    role: 'super_admin', department: 'Admin', is_active: true,
  },
  'staff@hgd.cm': {
    id: 'u002', email: 'staff@hgd.cm', full_name: 'Nurse Eposi Linda',
    role: 'nurse', department: 'ICU', is_active: true,
  },
  'head@hgd.cm': {
    id: 'u003', email: 'head@hgd.cm', full_name: 'Prof. Ngo Mireille',
    role: 'department_head', department: 'Surgery', is_active: true,
  },
  'doctor@hgd.cm': {
    id: 'u004', email: 'doctor@hgd.cm', full_name: 'Dr. Fru Richard',
    role: 'clinician', department: 'Blood Bank', is_active: true,
  },
  'patient@example.com': {
    id: 'u010', email: 'patient@example.com', full_name: 'Jean-Paul Kamga',
    role: 'patient', is_active: true,
  },
}

function mockDelay() {
  return new Promise<void>((r) => setTimeout(r, 600))
}

function mockLogin(data: LoginPayload): LoginResponse {
  if (data.password.length < 4) {
    throw Object.assign(new Error('Invalid credentials'), {
      response: { data: { detail: 'Password too short. (Mock: min 4 chars)' } },
    })
  }
  const user = MOCK_USERS[data.email.toLowerCase()]
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), {
      response: { data: { detail: `No mock account for "${data.email}". See SETUP.md for test credentials.` } },
    })
  }
  return { access_token: `mock_token_${user.role}`, token_type: 'bearer', user }
}

function mockRegister(data: RegisterPayload): LoginResponse {
  const user: User = {
    id: `u_${Date.now()}`,
    email: data.email,
    full_name: data.full_name,
    role: 'patient',
    is_active: true,
  }
  return { access_token: 'mock_token_patient', token_type: 'bearer', user }
}

// ── Auth API ───────────────────────────────────────────────────────────────
export const authApi = {
  login: async (data: LoginPayload): Promise<LoginResponse> => {
    if (MOCK_MODE) {
      await mockDelay()
      return mockLogin(data)
    }
    return api.post<LoginResponse>('/auth/login', data).then((r) => r.data)
  },

  register: async (data: RegisterPayload): Promise<LoginResponse> => {
    if (MOCK_MODE) {
      await mockDelay()
      return mockRegister(data)
    }
    return api.post<LoginResponse>('/auth/register', data).then((r) => r.data)
  },

  me: () => api.get<User>('/auth/me').then((r) => r.data),
}
