import axios from 'axios'

// ── Types ──────────────────────────────────────────────────────────────────
export interface PatientUser {
  id: string; email: string; full_name: string; role: string;
  phone?: string; date_of_birth?: string; is_active: boolean;
  language?: string;
}
export interface TokenResponse { access_token: string; token_type: string; expires_in: number; user: PatientUser; }
export interface RegisterPayload { full_name: string; email: string; phone?: string; date_of_birth?: string; password: string; otp_code: string; }
export interface RequestOtpPayload { email: string; purpose: 'register' | 'reset_password'; full_name?: string; }
export interface Department { id: string; name: string; informal_names: string[]; services: any[]; operating_hours: Record<string, any>; location: string | null; contact_details: Record<string, any>; is_active: boolean; created_at: string; updated_at: string; }
export interface Procedure { id: string; title: string; summary: string | null; content: string; steps: Record<string, any>[]; stream_target: string; applicable_roles: string[]; risk_level: string; status: string; department_id: string | null; language: string; version: number; document_url: string | null; published_at: string | null; created_at: string; updated_at: string; }
export interface ProcedureList { items: Procedure[]; total: number; skip: number; limit: number; }
export interface PipelineQueryPayload { raw_query: string; platform?: string; stream?: 'A' | 'B'; user_id?: string; session_id?: string; chatbot_mode?: boolean; }
export interface PipelineQueryResponse { output: any; output_type: string; is_emergency: boolean; had_result: boolean; language: string; intent: string | null; error: string | null; }
export interface NavigationPath { id: string; department_id: string; title: string; description_en: string; description_fr: string; estimated_time_minutes: number | null; is_active: boolean; }

// ── Helper ─────────────────────────────────────────────────────────────────
function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('aihps_patient_token')
}

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://127.0.0.1:8002/auth'
const SVC03_API_URL = process.env.NEXT_PUBLIC_SVC03_API_URL || 'http://127.0.0.1:8003'
const PIPELINE_API_URL = process.env.NEXT_PUBLIC_PIPELINE_API_URL || 'http://127.0.0.1:8020/pipeline'

// ── Auth axios ─────────────────────────────────────────────────────────────
const authAxios = axios.create({ baseURL: AUTH_API_URL, headers: { 'Content-Type': 'application/json' } })
authAxios.interceptors.request.use(c => { const t = getToken(); if (t) c.headers.Authorization = `Bearer ${t}`; return c })
authAxios.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401 && typeof window !== 'undefined') { localStorage.removeItem('aihps_patient_token'); window.location.href = '/sign-in'; }
  return Promise.reject(err)
})

// ── SVC03 axios ─────────────────────────────────────────────────────────────
const svc03Axios = axios.create({ baseURL: SVC03_API_URL, headers: { 'Content-Type': 'application/json' } })
svc03Axios.interceptors.request.use(c => { const t = getToken(); if (t) c.headers.Authorization = `Bearer ${t}`; return c })

// ── Pipeline axios ──────────────────────────────────────────────────────────
const pipelineAxios = axios.create({ baseURL: PIPELINE_API_URL, headers: { 'Content-Type': 'application/json' }, timeout: 120_000 })
pipelineAxios.interceptors.request.use(c => { const t = getToken(); if (t) c.headers.Authorization = `Bearer ${t}`; return c })

// ── Auth API ───────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => authAxios.post<TokenResponse>('/patient/login', data).then(r => r.data),
  requestOtp: (data: RequestOtpPayload) => authAxios.post<{ message: string }>('/request-otp', data).then(r => r.data),
  register: (data: RegisterPayload) => authAxios.post<TokenResponse>('/register', data).then(r => r.data),
  me: () => authAxios.get<PatientUser>('/me').then(r => r.data),
}

// ── Procedures API ─────────────────────────────────────────────────────────
export const proceduresApi = {
  list: (params?: { status?: string; stream?: string; dept_id?: string; skip?: number; limit?: number; language?: string }) =>
    svc03Axios.get<ProcedureList>('/procedures', { params }).then(r => r.data),
  listDepartments: (activeOnly = true) =>
    svc03Axios.get<Department[]>('/departments', { params: { active_only: activeOnly } }).then(r => r.data),
  listNavigation: () =>
    svc03Axios.get<NavigationPath[]>('/navigation').then(r => r.data),
}

// ── Pipeline API ───────────────────────────────────────────────────────────
export const pipelineApi = {
  query: (payload: PipelineQueryPayload) =>
    pipelineAxios.post<PipelineQueryResponse>('/query', payload).then(r => r.data),
}
