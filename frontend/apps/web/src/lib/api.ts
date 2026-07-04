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

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id?: string
  phone?: string
  date_of_birth?: string
  is_active: boolean
}

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'department_admin'
  | 'department_head'
  | 'doctor'
  | 'clinician'
  | 'nurse'
  | 'pharmacist'
  | 'lab_technician'
  | 'radiologist'
  | 'infection_control_officer'
  | 'staff'
  | 'patient'

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface RegisterPayload {
  full_name: string
  email: string
  phone?: string
  date_of_birth?: string
  password: string
  otp_code: string
}

export interface RequestOtpPayload {
  email: string
  purpose: 'register' | 'reset_password'
  full_name?: string
}

// ── Mock users (used when VITE_MOCK_AUTH=true) ─────────────────────────────
const MOCK_USERS: Record<string, User> = {
  'admin@hgd.cm': {
    id: 'u001', email: 'admin@hgd.cm', full_name: 'Dr. Ayuk Emmanuel',
    role: 'admin', is_active: true,
  },
  'super@hgd.cm': {
    id: 'u000', email: 'super@hgd.cm', full_name: 'System Administrator',
    role: 'super_admin', is_active: true,
  },
  'staff@hgd.cm': {
    id: 'u002', email: 'staff@hgd.cm', full_name: 'Nurse Eposi Linda',
    role: 'nurse', is_active: true,
  },
  'head@hgd.cm': {
    id: 'u003', email: 'head@hgd.cm', full_name: 'Prof. Ngo Mireille',
    role: 'department_head', is_active: true,
  },
  'doctor@hgd.cm': {
    id: 'u004', email: 'doctor@hgd.cm', full_name: 'Dr. Fru Richard',
    role: 'clinician', is_active: true,
  },
  'patient@example.com': {
    id: 'u010', email: 'patient@example.com', full_name: 'Jean-Paul Kamga',
    role: 'patient', is_active: true,
  },
}

function mockDelay() {
  return new Promise<void>((r) => setTimeout(r, 600))
}

function mockLogin(data: LoginPayload): TokenResponse {
  if (data.password.length < 4) {
    throw Object.assign(new Error('Invalid credentials'), {
      response: { data: { detail: 'Password too short.' } },
    })
  }
  const user = MOCK_USERS[data.email.toLowerCase()]
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), {
      response: { data: { detail: `No mock account for "${data.email}".` } },
    })
  }
  return { access_token: `mock_token_${user.role}`, token_type: 'bearer', expires_in: 28800, user }
}

function mockRegister(data: RegisterPayload): TokenResponse {
  const user: User = {
    id: `u_${Date.now()}`,
    email: data.email,
    full_name: data.full_name,
    role: 'patient',
    is_active: true,
  }
  return { access_token: 'mock_token_patient', token_type: 'bearer', expires_in: 28800, user }
}

// ── Auth API ───────────────────────────────────────────────────────────────
export const authApi = {
  login: async (data: LoginPayload): Promise<TokenResponse> => {
    if (MOCK_MODE) {
      await mockDelay()
      return mockLogin(data)
    }
    return api.post<TokenResponse>('/auth/login', data).then((r) => r.data)
  },

  requestOtp: async (data: RequestOtpPayload): Promise<{ message: string }> => {
    if (MOCK_MODE) {
      await mockDelay()
      return { message: 'OTP sent (mock mode).' }
    }
    return api.post('/auth/request-otp', data).then((r) => r.data)
  },

  register: async (data: RegisterPayload): Promise<TokenResponse> => {
    if (MOCK_MODE) {
      await mockDelay()
      return mockRegister(data)
    }
    return api.post<TokenResponse>('/auth/register', data).then((r) => r.data)
  },

  me: () => api.get<User>('/auth/me').then((r) => r.data),
}

// ── Admin staff / user management ─────────────────────────────────────────

export interface ApiUser {
  id: string
  email: string
  full_name: string
  role: string
  employee_id: string | null
  department_id: string | null
  phone: string | null
  date_of_birth: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
}

export interface ApiUserList {
  items: ApiUser[]
  total: number
  skip: number
  limit: number
}

export interface CreateStaffPayload {
  full_name: string
  email: string
  password: string
  role: string
  employee_id?: string
  phone?: string
}

export const staffApi = {
  list: (params?: { role?: string; search?: string; skip?: number; limit?: number }) =>
    api.get<ApiUserList>('/auth/users', { params }).then((r) => r.data),

  create: (data: CreateStaffPayload) =>
    api.post<ApiUser>('/auth/users', data).then((r) => r.data),

  setActive: (userId: string, active: boolean) =>
    api.patch<ApiUser>(`/auth/users/${userId}`, { is_active: active }).then((r) => r.data),

  resetPassword: (userId: string, newPassword: string) =>
    api.post(`/auth/users/${userId}/reset-password`, { new_password: newPassword }),
}

// ── Pipeline (AI Agent) API ────────────────────────────────────────────────

// Uses a relative URL so Vite proxy handles it in dev (/api/pipeline → localhost:8020)
// and nginx handles it in production (/api/pipeline → svc_agents:8020)
const pipeline = axios.create({ headers: { 'Content-Type': 'application/json' } })
pipeline.interceptors.request.use((config) => {
  const token = localStorage.getItem('aihps_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface PipelineQueryPayload {
  raw_query: string
  platform?: string
  stream?: 'A' | 'B'
  user_id?: string
  user_role?: string
  session_id?: string
  chatbot_mode?: boolean
}

export interface PipelineQueryResponse {
  output: any
  output_type: string
  is_emergency: boolean
  had_result: boolean
  language: string
  intent: string | null
  error: string | null
}

export const pipelineApi = {
  query: (payload: PipelineQueryPayload) =>
    pipeline.post<PipelineQueryResponse>('/api/pipeline/query', payload).then((r) => r.data),
}
