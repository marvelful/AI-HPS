import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-surf-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </div>
      <footer className="text-center py-4 text-xs text-text-sec">
        AI-HPS · Hôpital Général de Douala · Clinically safe, AI-assisted hospital operations
      </footer>
    </div>
  )
}
