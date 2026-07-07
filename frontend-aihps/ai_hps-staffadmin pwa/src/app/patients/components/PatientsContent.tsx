'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Info, UserX, UserCheck } from 'lucide-react';
import KPICard from '@/components/ui/KPICard';
import Badge from '@/components/ui/Badge';
import { patientsApi, type ApiUser } from '@/lib/api';

interface Patient {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  email: string;
  phone: string;
  dob: string;
  age: number;
  registered: string;
  status: 'active' | 'inactive';
}

const AVATAR_COLORS = ['#5B21B6', '#004A8F', '#2E7D32', '#E8620A', '#0891B2', '#C62828'];

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
}

function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatDob(dateStr: string | null): { dob: string; age: number } {
  if (!dateStr) return { dob: '—', age: 0 };
  try {
    const d = new Date(dateStr);
    const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
    const dob = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { dob, age };
  } catch {
    return { dob: dateStr, age: 0 };
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return '1 month ago';
    return `${Math.floor(diffDays / 30)} months ago`;
  } catch {
    return dateStr;
  }
}

function mapApiUserToPatient(u: ApiUser): Patient {
  const { dob, age } = formatDob(u.date_of_birth);
  return {
    id: u.id,
    name: u.full_name,
    initials: getInitials(u.full_name),
    avatarColor: hashColor(u.id),
    email: u.email,
    phone: u.phone ?? '—',
    dob,
    age,
    registered: formatRelativeTime(u.created_at),
    status: u.is_active ? 'active' : 'inactive',
  };
}

export default function PatientsContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const qc = useQueryClient();

  const { data: patientsListData, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsApi.list({ limit: 200 }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      patientsApi.setActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });

  const patientsData: Patient[] = (patientsListData?.items ?? []).map(mapApiUserToPatient);

  const filtered = patientsData.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const total = patientsListData?.total ?? patientsData.length;
  const activeCount = patientsData.filter((p) => p.status === 'active').length;
  const inactiveCount = patientsData.filter((p) => p.status === 'inactive').length;

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-bold text-foreground" style={{ fontSize: '26px' }}>Patients</h1>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <KPICard title="TOTAL REGISTERED" value={isLoading ? '…' : total.toLocaleString()} accentColor="#004A8F" />
        <KPICard title="ACTIVE ACCOUNTS" value={isLoading ? '…' : activeCount.toString()} accentColor="#2E7D32" />
        <KPICard title="INACTIVE" value={isLoading ? '…' : inactiveCount.toString()} accentColor="#E65100" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patients by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{ fontSize: '13px' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ fontSize: '13px' }}
        >
          {['All', 'Active', 'Inactive'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-md shadow-card overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                {['Patient', 'Email', 'Phone', 'Date of Birth', 'Registered', 'Status', 'Action'].map((col) => (
                  <th key={`th-${col}`} className="px-4 py-3 text-left label-meta text-muted-foreground whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-border" style={{ height: '52px' }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-2">
                        <div className="h-4 bg-muted animate-pulse rounded" style={{ width: j === 0 ? '140px' : '100px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground" style={{ fontSize: '14px' }}>No patients match your search.</td>
                </tr>
              ) : (
                filtered.map((patient, idx) => (
                  <tr key={patient.id} className={`border-b border-border last:border-0 hover:bg-background transition-colors ${idx % 2 === 1 ? 'bg-background/50' : ''}`} style={{ height: '52px' }}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ backgroundColor: patient.avatarColor, fontSize: '11px' }}>
                          {patient.initials}
                        </div>
                        <span className="font-semibold text-foreground" style={{ fontSize: '14px' }}>{patient.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '13px' }}>{patient.email}</td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '13px' }}>{patient.phone}</td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '13px' }}>{patient.dob} {patient.age > 0 && <span style={{ fontSize: '12px' }}>({patient.age} yrs)</span>}</td>
                    <td className="px-4 py-2 text-muted-foreground" style={{ fontSize: '13px' }}>{patient.registered}</td>
                    <td className="px-4 py-2">
                      <Badge variant={patient.status}>{patient.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => toggleActive.mutate({ id: patient.id, active: patient.status !== 'active' })}
                        disabled={toggleActive.isPending}
                        title={patient.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                          patient.status === 'active'
                            ? 'text-clinical-red bg-clinical-red-bg hover:bg-clinical-red/10'
                            : 'text-clinical-green bg-clinical-green-bg hover:bg-clinical-green/10'
                        }`}
                      >
                        {patient.status === 'active'
                          ? <><UserX size={12} /> Deactivate</>
                          : <><UserCheck size={12} /> Activate</>}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note card */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-md bg-primary-light border border-primary/20">
        <Info size={15} className="text-primary mt-0.5 flex-shrink-0" />
        <p className="text-primary" style={{ fontSize: '13px' }}>
          Patients register via the mobile app. Deactivated accounts cannot log in.
        </p>
      </div>
    </>
  );
}
