import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PatientLayout } from '@/pages/patient/PatientLayout'

import PatientSplashPage    from '@/pages/patient/PatientSplashPage'
import PatientLoginPage     from '@/pages/patient/PatientLoginPage'
import PatientRegisterPage  from '@/pages/patient/PatientRegisterPage'
import ForgotPasswordPage   from '@/pages/auth/ForgotPasswordPage'

import PatientHomePage        from '@/pages/patient/PatientHomePage'
import PatientProceduresPage  from '@/pages/patient/PatientProceduresPage'
import PatientDepartmentsPage from '@/pages/patient/PatientDepartmentsPage'
import PatientProfilePage     from '@/pages/patient/PatientProfilePage'
import AssistantPage          from '@/pages/patient/AssistantPage'
import ProcedureDetailPage    from '@/pages/patient/ProcedureDetailPage'

const router = createBrowserRouter([
  /* ─── Public ─── */
  { path: '/', element: <PatientSplashPage /> },

  /* ─── Auth ─── */
  {
    element: <AuthLayout />,
    children: [
      { path: 'login',           element: <PatientLoginPage /> },
      { path: 'register',        element: <PatientRegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },

  /* ─── Patient portal ─── */
  {
    path: 'patient',
    element: (
      <ProtectedRoute allowedRoles={['patient']} fallbackTo="/login">
        <PatientLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,           element: <Navigate to="home" replace /> },
      { path: 'home',          element: <PatientHomePage /> },
      { path: 'procedures',    element: <PatientProceduresPage /> },
      { path: 'departments',   element: <PatientDepartmentsPage /> },
      { path: 'profile',       element: <PatientProfilePage /> },
      { path: 'assistant',     element: <AssistantPage /> },
      { path: 'procedure/:id', element: <ProcedureDetailPage /> },
    ],
  },

  /* ─── Fallback ─── */
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function PatientApp() {
  return <RouterProvider router={router} />
}
