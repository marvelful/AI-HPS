'use client';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Search, X, Eye, EyeOff, CheckCircle, Copy, Check, UserX, UserCheck, Edit3 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { toast } from 'sonner';
import { staffApi, type ApiUser, type CreateStaffPayload } from '@/lib/api';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: string;
  role: 'super_admin' | 'admin' | 'department_admin' | 'department_head' | 'doctor' | 'nurse' | 'pharmacist' | 'lab_technician' | 'staff';
  roleLabel: string;
  department: string;
  employeeId: string;
  phone: string;
  created: string;
  status: 'active' | 'inactive';
}

// Avatar color palette keyed by role
const ROLE_COLORS: Record<string, string> = {
  super_admin: '#1A1A2E',
  admin: '#004A8F',
  department_admin: '#0E4D8F',
  department_head: '#5B21B6',
  doctor: '#2E7D32',
  clinician: '#2E7D32',
  nurse: '#0891B2',
  pharmacist: '#7B2FBE',
  lab_technician: '#E65100',
  radiologist: '#E8620A',
  infection_control_officer: '#C62828',
  staff: '#6B7280',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  department_admin: 'Dept Admin',
  department_head: 'Dept Head',
  doctor: 'Doctor',
  clinician: 'Clinician',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Tech',
  radiologist: 'Radiologist',
  infection_control_officer: 'ICO',
  staff: 'Staff',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function mapApiUser(u: ApiUser): StaffMember {
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    initials: getInitials(u.full_name),
    avatarColor: ROLE_COLORS[u.role] ?? '#6B7280',
    role: u.role as StaffMember['role'],
    roleLabel: ROLE_LABELS[u.role] ?? u.role,
    department: u.department_id ?? '—',
    employeeId: u.employee_id ?? '—',
    phone: u.phone ?? '—',
    created: formatDate(u.created_at),
    status: u.is_active ? 'active' : 'inactive',
  };
}

const ROLES = ['All Roles', 'super_admin', 'admin', 'department_head', 'doctor', 'nurse', 'pharmacist', 'lab_technician'];
const DEPARTMENTS = ['All Departments', 'Surgery', 'Maternity', 'ICU', 'Infection Control Dept', 'Bloodbank'];
const STATUSES = ['All', 'Active', 'Inactive'];

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'department_admin', label: 'Department Admin' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'lab_technician', label: 'Lab Technician' },
];

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#C62828', '#E65100', '#E8620A', '#2E7D32'];
  return { score, label: labels[score], color: colors[score] };
}

function CreateStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdEmail, setCreatedEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: '', department: '', employeeId: '', phone: '' });

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role || !form.department || !form.employeeId || !password) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const payload: CreateStaffPayload = {
        full_name: form.name,
        email: form.email,
        password,
        role: form.role,
        employee_id: form.employeeId || undefined,
        phone: form.phone || undefined,
      };
      await staffApi.create(payload);
      setCreatedEmail(form.email);
      setSuccess(true);
      toast.success('Staff account created successfully!');
      onCreated();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create staff account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(createdEmail).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-lg shadow-card-lg w-full max-w-md" style={{ borderRadius: '12px', animation: 'modalIn 150ms ease' }}>
        {success ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-clinical-green-bg flex items-center justify-center">
              <CheckCircle size={36} className="text-clinical-green" />
            </div>
            <div>
              <p className="font-bold text-clinical-green" style={{ fontSize: '20px' }}>Staff account created!</p>
              <p className="text-muted-foreground mt-1" style={{ fontSize: '14px' }}>Login credentials for:</p>
            </div>
            <button
              onClick={handleCopyEmail}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary-light text-primary font-mono border border-primary/20 hover:bg-primary/10 transition-colors"
              style={{ fontSize: '13px' }}
            >
              {createdEmail}
              {copied ? <Check size={13} className="text-clinical-green" /> : <Copy size={13} />}
            </button>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-sm bg-primary text-white font-semibold hover:bg-primary-hover transition-colors"
              style={{ fontSize: '14px' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-foreground" style={{ fontSize: '18px' }}>Add Staff Member</h2>
              <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Full Name <span className="text-clinical-red">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Full Name" className="px-3 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
              </div>
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Email Address <span className="text-clinical-red">*</span></label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@hgd-douala.cm" className="px-3 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
              </div>
              {/* Role */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Role <span className="text-clinical-red">*</span></label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
                  <option value="">Select role…</option>
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {/* Department */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Department <span className="text-clinical-red">*</span></label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.filter(d => d !== 'All Departments').map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {/* Employee ID */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Employee ID <span className="text-clinical-red">*</span></label>
                <input type="text" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="EMP-XXXX" className="px-3 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" style={{ fontSize: '13px' }} />
              </div>
              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Phone Number</label>
                <div className="flex">
                  <span className="flex items-center px-3 border border-r-0 border-border rounded-l-sm bg-surface-alt text-muted-foreground font-medium" style={{ fontSize: '13px' }}>+237</span>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="6XX XXX XXX" className="flex-1 px-3 py-2 border border-border rounded-r-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
                </div>
              </div>
              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Password <span className="text-clinical-red">*</span></label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" className="w-full pr-10 px-3 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {password && (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((seg) => (
                        <div key={seg} className="flex-1 h-1.5 rounded-full transition-colors duration-300" style={{ backgroundColor: seg <= strength.score ? strength.color : '#E2E8F0' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-sm border border-border text-foreground hover:bg-muted transition-colors font-medium" style={{ fontSize: '13px' }}>Cancel</button>
              <button type="submit" disabled={loading} className="px-5 py-2 rounded-sm bg-primary text-white font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center gap-2" style={{ fontSize: '13px' }}>
                {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EditStaffModal({
  member,
  onClose,
  onSaved,
}: {
  member: StaffMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: member.name,
    email: member.email,
    role: member.role,
    employeeId: member.employeeId === '—' ? '' : member.employeeId,
    phone: member.phone === '—' ? '' : member.phone,
    isActive: member.status === 'active',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.role) {
      toast.error('Name, email, and role are required.');
      return;
    }
    setLoading(true);
    try {
      await staffApi.update(member.id, {
        full_name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        employee_id: form.employeeId.trim() || null,
        phone: form.phone.trim() || null,
        is_active: form.isActive,
      });
      toast.success('Staff details updated.');
      onSaved();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update staff details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-lg shadow-card-lg w-full max-w-md" style={{ borderRadius: '12px' }}>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-bold text-foreground" style={{ fontSize: '18px' }}>Edit Staff Member</h2>
            <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <div className="px-6 py-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Email Address</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffMember['role'] })} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Employee ID</label>
              <input type="text" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" style={{ fontSize: '13px' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Phone Number</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
            </div>
            <label className="flex items-center gap-2 text-foreground" style={{ fontSize: '13px' }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
              Active account
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-sm border border-border text-foreground hover:bg-muted transition-colors font-medium" style={{ fontSize: '13px' }}>Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-sm bg-primary text-white font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center gap-2" style={{ fontSize: '13px' }}>
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffContent() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

  const queryClient = useQueryClient();

  const { data: staffListData, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.list({ limit: 100 }),
  });

  const staff: StaffMember[] = (staffListData?.items ?? [])
    .filter((u) => u.role !== 'patient')
    .map(mapApiUser);

  const filtered = staff.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All Roles' || s.role === roleFilter;
    const matchDept = deptFilter === 'All Departments' || s.department === deptFilter;
    const matchStatus = statusFilter === 'All' || s.status === statusFilter.toLowerCase();
    return matchSearch && matchRole && matchDept && matchStatus;
  });

  const toggleStatus = async (id: string) => {
    const member = staff.find((s) => s.id === id);
    if (!member) return;
    const newActive = member.status !== 'active';
    try {
      await staffApi.setActive(id, newActive);
      toast.success(`${member.name} ${newActive ? 'activated' : 'deactivated'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    } catch {
      toast.error(`Failed to update status for ${member.name}.`);
    }
  };

  return (
    <>
      {showModal && (
        <CreateStaffModal
          onClose={() => setShowModal(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['staff'] })}
        />
      )}
      {editingMember && (
        <EditStaffModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['staff'] })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-bold text-foreground" style={{ fontSize: '26px' }}>Hospital Staff</h1>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium" style={{ fontSize: '12px' }}>
            {isLoading ? '…' : `${staffListData?.total ?? staff.length} staff members`}
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-primary text-white font-semibold hover:bg-primary-hover transition-all active:scale-[0.97]"
          style={{ fontSize: '13px' }}
        >
          <UserPlus size={15} />
          Add Staff Member
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{ fontSize: '13px' }}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-md shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                {['Staff Member', 'Role', 'Department', 'Employee ID', 'Phone', 'Created', 'Status', 'Actions'].map((col) => (
                  <th key={`th-${col}`} className="px-4 py-3 text-left label-meta text-muted-foreground whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-border" style={{ height: '56px' }}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-2">
                        <div className="h-4 bg-muted animate-pulse rounded" style={{ width: j === 0 ? '140px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground" style={{ fontSize: '14px' }}>No staff members match your filters.</td>
                </tr>
              ) : (
                filtered.map((member, idx) => (
                  <tr key={member.id} className={`border-b border-border last:border-0 hover:bg-background transition-colors ${idx % 2 === 1 ? 'bg-background/50' : ''}`} style={{ height: '56px' }}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ backgroundColor: member.avatarColor, fontSize: '11px' }}>
                          {member.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground" style={{ fontSize: '14px' }}>{member.name}</p>
                          <p className="font-mono text-muted-foreground" style={{ fontSize: '11px' }}>{member.employeeId.toLowerCase().replace('-', '_')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2"><Badge variant={member.role}>{member.roleLabel}</Badge></td>
                    <td className="px-4 py-2 text-foreground" style={{ fontSize: '13px' }}>{member.department}</td>
                    <td className="px-4 py-2"><span className="font-mono text-muted-foreground" style={{ fontSize: '12px' }}>{member.employeeId}</span></td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '13px' }}>{member.phone}</td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '13px' }}>{member.created}</td>
                    <td className="px-4 py-2">
                      <Badge variant={member.status}>{member.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingMember(member)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium" style={{ fontSize: '12px' }}>
                          <Edit3 size={12} /> Edit
                        </button>
                        {member.status === 'active' ? (
                          <button onClick={() => toggleStatus(member.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-clinical-amber/50 text-clinical-amber hover:bg-clinical-amber-bg transition-colors font-medium" style={{ fontSize: '12px' }}>
                            <UserX size={12} /> Deactivate
                          </button>
                        ) : (
                          <button onClick={() => toggleStatus(member.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-clinical-green/50 text-clinical-green hover:bg-clinical-green-bg transition-colors font-medium" style={{ fontSize: '12px' }}>
                            <UserCheck size={12} /> Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
