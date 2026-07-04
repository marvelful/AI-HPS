import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'

import StaffLandingPage from '@/pages/staff/StaffLandingPage'
import StaffLoginPage   from '@/pages/staff/StaffLoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'

import DashboardPage      from '@/pages/admin/DashboardPage'
import ProceduresPage     from '@/pages/admin/ProceduresPage'
import ApprovalsPage      from '@/pages/admin/ApprovalsPage'
import AnalyticsPage      from '@/pages/admin/AnalyticsPage'
import AuditLogPage       from '@/pages/admin/AuditLogPage'
import UsersPage          from '@/pages/admin/UsersPage'
import StaffPage          from '@/pages/admin/StaffPage'
import PatientsPage       from '@/pages/admin/PatientsPage'
import AIMonitorPage      from '@/pages/admin/AIMonitorPage'
import NotificationsPage  from '@/pages/admin/NotificationsPage'
import AdminAssistantPage from '@/pages/admin/AdminAssistantPage'

// All roles that may access the staff/admin portal
const ALL_STAFF_ROLES = [
  'super_admin', 'admin', 'department_admin', 'department_head',
  'doctor', 'clinician', 'nurse', 'pharmacist',
  'lab_technician', 'radiologist', 'infection_control_officer', 'staff',
] as const

// Only admins may access sensitive management pages
const ADMIN_ONLY_ROLES = ['super_admin', 'admin'] as const

const router = createBrowserRouter([
  /* ─── Public ─── */
  { path: '/', element: <StaffLandingPage /> },

  /* ─── Auth ─── */
  {
    element: <AuthLayout />,
    children: [
      { path: 'login',           element: <StaffLoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },

  /* ─── Admin / Staff portal ─── */
  {
    path: 'admin',
    element: (
      <ProtectedRoute allowedRoles={[...ALL_STAFF_ROLES]} fallbackTo="/login">
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,           element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard',     element: <DashboardPage /> },
      { path: 'procedures',    element: <ProceduresPage /> },
      { path: 'assistant',     element: <AdminAssistantPage /> },

      // Admin-only pages — non-admins see a redirect to dashboard
      {
        path: 'approvals',
        element: (
          <ProtectedRoute allowedRoles={[...ADMIN_ONLY_ROLES, 'department_head']} fallbackTo="/admin/dashboard">
            <ApprovalsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute allowedRoles={[...ADMIN_ONLY_ROLES]} fallbackTo="/admin/dashboard">
            <AnalyticsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'audit',
        element: (
          <ProtectedRoute allowedRoles={[...ADMIN_ONLY_ROLES]} fallbackTo="/admin/dashboard">
            <AuditLogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={[...ADMIN_ONLY_ROLES]} fallbackTo="/admin/dashboard">
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'staff',
        element: (
          <ProtectedRoute allowedRoles={[...ADMIN_ONLY_ROLES]} fallbackTo="/admin/dashboard">
            <StaffPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'patients',
        element: (
          <ProtectedRoute allowedRoles={[...ADMIN_ONLY_ROLES]} fallbackTo="/admin/dashboard">
            <PatientsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'ai-monitor',
        element: (
          <ProtectedRoute allowedRoles={[...ADMIN_ONLY_ROLES]} fallbackTo="/admin/dashboard">
            <AIMonitorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
    ],
  },

  /* ─── Fallback ─── */
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
