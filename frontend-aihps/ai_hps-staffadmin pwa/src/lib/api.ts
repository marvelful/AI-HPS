import axios from 'axios'

// ── Types ─────────────────────────────────────────────────────────────────
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

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

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

export interface UpdateStaffPayload {
  full_name?: string
  email?: string
  role?: string
  employee_id?: string | null
  phone?: string | null
  is_active?: boolean
}

export interface Department {
  id: string
  name: string
  informal_names: string[]
  services: any[]
  operating_hours: Record<string, any>
  location: string | null
  contact_details: Record<string, any>
  is_active: boolean
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface Procedure {
  id: string
  title: string
  summary: string | null
  content: string
  steps: Record<string, any>[]
  compliance_annotations: Record<string, any>[]
  stream_target: string
  applicable_roles: string[]
  risk_level: string
  status: string
  department_id: string | null
  category_id: string | null
  language: string
  version: number
  document_url: string | null
  created_by: string
  updated_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ProcedureList {
  items: Procedure[]
  total: number
  skip: number
  limit: number
}

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

export interface AnalyticsSummary {
  total_queries: number
  successful_queries: number
  success_rate_pct: number
  avg_response_ms: number | null
  top_intents: Record<string, number>
  top_platforms: Record<string, number>
}

export interface ContentGap {
  id: string
  query: string
  occurrence_count: number
  first_seen: string
  last_seen: string
}

export interface AuditEvent {
  id: string
  event_type: string
  user_id: string
  entity_type: string
  entity_id: string
  changes: any
  ip_address: string
  created_at: string
  event_metadata: any
}

export interface AuditEventList {
  items: AuditEvent[]
  total: number
  skip: number
  limit: number
}

// ── Helper to get token ──────────────────────────────────────────────────
function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('aihps_token')
}

// ── Auth axios ────────────────────────────────────────────────────────────
const authAxios = axios.create({ baseURL: '/api/auth', headers: { 'Content-Type': 'application/json' } })
authAxios.interceptors.request.use((c) => {
  const t = getToken()
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})
authAxios.interceptors.response.use(
  (r) => r,
  (err) => {
    const reqUrl: string = err.config?.url ?? '';
    // Only auto-logout on 401 for authenticated requests, not the login attempt itself
    if (err.response?.status === 401 && typeof window !== 'undefined' && !reqUrl.includes('/login')) {
      localStorage.removeItem('aihps_token')
      window.location.href = '/staff-login'
    }
    return Promise.reject(err)
  }
)

// ── SVC03 axios ────────────────────────────────────────────────────────────
const svc03Axios = axios.create({ headers: { 'Content-Type': 'application/json' } })
svc03Axios.interceptors.request.use((c) => {
  const t = getToken()
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})
// svc03 errors are shown inline — do not redirect to login (that would cause instant logout on load)

// ── Pipeline axios ─────────────────────────────────────────────────────────
const pipelineAxios = axios.create({ headers: { 'Content-Type': 'application/json' }, timeout: 120_000 })
pipelineAxios.interceptors.request.use((c) => {
  const t = getToken()
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})

// ── Analytics axios ────────────────────────────────────────────────────────
const analyticsAxios = axios.create({ baseURL: '/api/analytics', headers: { 'Content-Type': 'application/json' } })
analyticsAxios.interceptors.request.use((c) => {
  const t = getToken()
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})

// ── Audit axios ────────────────────────────────────────────────────────────
const auditAxios = axios.create({ baseURL: '/api/audit', headers: { 'Content-Type': 'application/json' } })
auditAxios.interceptors.request.use((c) => {
  const t = getToken()
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})

// ── Auth API ───────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) =>
    authAxios.post<TokenResponse>('/login', data).then((r) => r.data),
  me: () => authAxios.get<User>('/me').then((r) => r.data),
  logout: () => authAxios.post('/logout').catch(() => {}),
}

// ── Staff API ──────────────────────────────────────────────────────────────
export const staffApi = {
  list: (params?: { role?: string; search?: string; skip?: number; limit?: number }) =>
    authAxios.get<ApiUserList>('/users', { params }).then((r) => r.data),
  create: (data: CreateStaffPayload) =>
    authAxios.post<ApiUser>('/users', data).then((r) => r.data),
  update: (userId: string, data: UpdateStaffPayload) =>
    authAxios.patch<ApiUser>(`/users/${userId}`, data).then((r) => r.data),
  setActive: (userId: string, active: boolean) =>
    authAxios.patch<ApiUser>(`/users/${userId}`, { is_active: active }).then((r) => r.data),
}

// ── Patients API ───────────────────────────────────────────────────────────
export const patientsApi = {
  list: (params?: { is_active?: boolean; search?: string; skip?: number; limit?: number }) =>
    authAxios.get<ApiUserList>('/patients', { params }).then((r) => r.data),
  setActive: (userId: string, active: boolean) =>
    authAxios.patch<ApiUser>(`/patients/${userId}`, { is_active: active }).then((r) => r.data),
}

// ── Procedures API ─────────────────────────────────────────────────────────
export const proceduresApi = {
  list: (params?: { status?: string; stream?: string; dept_id?: string; skip?: number; limit?: number; language?: string }) =>
    svc03Axios.get<ProcedureList>('/api/svc03/procedures', { params }).then((r) => r.data),
  get: (id: string) =>
    svc03Axios.get<Procedure>(`/api/svc03/procedures/${id}`).then((r) => r.data),
  create: (data: any) =>
    svc03Axios.post<Procedure>('/api/svc03/procedures', data).then((r) => r.data),
  update: (id: string, data: any) =>
    svc03Axios.put<Procedure>(`/api/svc03/procedures/${id}`, data).then((r) => r.data),
  submitApproval: (id: string, approver_ids: string[] = []) =>
    svc03Axios.post(`/api/svc03/procedures/${id}/submit`, { approver_ids }).then((r) => r.data),
  approve: (id: string, decision: 'approved' | 'rejected', comment?: string) =>
    svc03Axios.post(`/api/svc03/procedures/${id}/approve`, { decision, comment }).then((r) => r.data),
  listDepartments: (activeOnly = true) =>
    svc03Axios
      .get<Department[]>('/api/svc03/departments', { params: { active_only: activeOnly } })
      .then((r) => r.data),
}

// ── Pipeline API ───────────────────────────────────────────────────────────
export const pipelineApi = {
  query: (payload: PipelineQueryPayload) =>
    pipelineAxios.post<PipelineQueryResponse>('/api/pipeline/query', payload).then((r) => r.data),
  health: () => pipelineAxios.get('/api/pipeline/health').then((r) => r.data),
  kbStatus: () => pipelineAxios.get('/api/pipeline/kb-status').then((r) => r.data),
  rebuildKb: () => pipelineAxios.post('/api/pipeline/rebuild-kb').then((r) => r.data),
}

// ── Analytics API ──────────────────────────────────────────────────────────
export const analyticsApi = {
  summary: () => analyticsAxios.get<AnalyticsSummary>('/summary').then((r) => r.data),
  queries: (params?: { skip?: number; limit?: number; platform?: string; stream?: string }) =>
    analyticsAxios.get('/queries', { params }).then((r) => r.data),
  gaps: (params?: { skip?: number; limit?: number }) =>
    analyticsAxios.get<{ items: ContentGap[]; total: number }>('/gaps', { params }).then((r) => r.data.items ?? r.data),
}

// ── Audit API ──────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params?: { skip?: number; limit?: number; event_type?: string; user_id?: string }) =>
    auditAxios.get<AuditEventList>('/events/', { params }).then((r) => r.data),
  get: (id: string) => auditAxios.get<AuditEvent>(`/events/${id}`).then((r) => r.data),
  verify: (id: string) => auditAxios.get(`/events/${id}/verify`).then((r) => r.data),
}
