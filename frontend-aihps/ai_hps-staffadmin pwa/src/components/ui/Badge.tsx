import React from 'react';

type BadgeVariant =
  | 'draft' | 'pending' | 'published' | 'archived' |'critical'| 'high' | 'medium' | 'low' |'patient'| 'staff-only' | 'both' |'super_admin' | 'admin' | 'department_head' | 'doctor' | 'nurse' | 'pharmacist' | 'lab_technician'
  | 'active'| 'inactive' | 'degraded' |'login'| 'logout' | 'procedure_view' | 'procedure_edit' | 'approval' | 'user_create' | 'ai_query' | 'emergency' |'ai-purple'| 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'teal' | 'orange' | 'purple' | 'indigo' | 'patient-role' |'web' | 'whatsapp' | 'sms' | 'mobile';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-clinical-amber-bg text-clinical-amber',
  published: 'bg-clinical-green-bg text-clinical-green',
  archived: 'bg-gray-100 text-gray-500',
  critical: 'bg-clinical-red-bg text-clinical-red',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-clinical-green-bg text-clinical-green',
  patient: 'bg-primary-light text-primary',
  'staff-only': 'bg-ai-purple-bg text-ai-purple',
  both: 'bg-clinical-green-bg text-clinical-green',
  super_admin: 'bg-slate-800 text-white',
  admin: 'bg-primary text-white',
  department_head: 'bg-teal-100 text-teal-700',
  doctor: 'bg-clinical-green-bg text-clinical-green',
  nurse: 'bg-cyan-100 text-cyan-700',
  pharmacist: 'bg-ai-purple-bg text-ai-purple',
  lab_technician: 'bg-clinical-amber-bg text-clinical-amber',
  active: 'bg-clinical-green-bg text-clinical-green',
  inactive: 'bg-gray-100 text-gray-500',
  degraded: 'bg-clinical-amber-bg text-clinical-amber',
  login: 'bg-primary text-white',
  logout: 'bg-gray-200 text-gray-600',
  procedure_view: 'bg-teal-100 text-teal-700',
  procedure_edit: 'bg-orange-100 text-orange-700',
  approval: 'bg-clinical-green-bg text-clinical-green',
  user_create: 'bg-ai-purple-bg text-ai-purple',
  ai_query: 'bg-indigo-100 text-indigo-700',
  emergency: 'bg-clinical-red-bg text-clinical-red',
  'ai-purple': 'bg-ai-purple-bg text-ai-purple',
  blue: 'bg-primary-light text-primary',
  green: 'bg-clinical-green-bg text-clinical-green',
  amber: 'bg-clinical-amber-bg text-clinical-amber',
  red: 'bg-clinical-red-bg text-clinical-red',
  gray: 'bg-gray-100 text-gray-600',
  teal: 'bg-teal-100 text-teal-700',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-ai-purple-bg text-ai-purple',
  indigo: 'bg-indigo-100 text-indigo-700',
  'patient-role': 'bg-primary-light text-primary',
  web: 'bg-primary-light text-primary',
  whatsapp: 'bg-clinical-green-bg text-clinical-green',
  sms: 'bg-gray-100 text-gray-600',
  mobile: 'bg-ai-purple-bg text-ai-purple',
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full label-meta ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}