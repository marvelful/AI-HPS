import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PatientLayout } from '@/pages/patient/PatientLayout'

import LandingPage        from '@/pages/LandingPage'
import LoginPage          from '@/pages/auth/LoginPage'
import RegisterPage       from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'

import DashboardPage      from '@/pages/admin/DashboardPage'
import ProceduresPage     from '@/pages/admin/ProceduresPage'
import ApprovalsPage      from '@/pages/admin/ApprovalsPage'
import AnalyticsPage      from '@/pages/admin/AnalyticsPage'
import AuditLogPage       from '@/pages/admin/AuditLogPage'
import UsersPage          from '@/pages/admin/UsersPage'
import AIMonitorPage      from '@/pages/admin/AIMonitorPage'
import NotificationsPage  from '@/pages/admin/NotificationsPage'

import PatientHomePage        from '@/pages/patient/PatientHomePage'
import PatientProceduresPage  from '@/pages/patient/PatientProceduresPage'
import PatientDepartmentsPage from '@/pages/patient/PatientDepartmentsPage'
import PatientProfilePage     from '@/pages/patient/PatientProfilePage'
import AssistantPage          from '@/pages/patient/AssistantPage'
import ProcedureDetailPage    from '@/pages/patient/ProcedureDetailPage'

const STAFF_ROLES = ['super_admin', 'admin', 'department_head', 'clinician', 'nurse'] as const

const router = createBrowserRouter([
  /* ─── Public ─── */
  { path: '/', element: <LandingPage /> },

  /* ─── Auth ─── */
  {
    element: <AuthLayout />,
    children: [
      { path: 'login',            element: <LoginPage /> },
      { path: 'forgot-password',  element: <ForgotPasswordPage /> },
      { path: 'patient/login',    element: <LoginPage /> },
      { path: 'patient/register', element: <RegisterPage /> },
    ],
  },

  /* ─── Admin / Staff portal ─── */
  {
    path: 'admin',
    element: (
      <ProtectedRoute allowedRoles={[...STAFF_ROLES]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,          element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',    element: <DashboardPage /> },
      { path: 'procedures',   element: <ProceduresPage /> },
      { path: 'approvals',    element: <ApprovalsPage /> },
      { path: 'analytics',    element: <AnalyticsPage /> },
      { path: 'audit',        element: <AuditLogPage /> },
      { path: 'users',        element: <UsersPage /> },
      { path: 'ai-monitor',   element: <AIMonitorPage /> },
      { path: 'notifications',element: <NotificationsPage /> },
    ],
  },

  /* ─── Patient mobile portal ─── */
  {
    path: 'patient',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <PatientLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,                 element: <Navigate to="home" replace /> },
      { path: 'home',                element: <PatientHomePage /> },
      { path: 'procedures',          element: <PatientProceduresPage /> },
      { path: 'departments',         element: <PatientDepartmentsPage /> },
      { path: 'profile',             element: <PatientProfilePage /> },
      { path: 'assistant',           element: <AssistantPage /> },
      { path: 'procedure/:id',       element: <ProcedureDetailPage /> },
    ],
  },

  /* ─── Fallback ─── */
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
