'use client';
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, ChevronUp, ChevronDown, MoreHorizontal, ClipboardList, X, FileText, Upload } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import RiskDot from '@/components/ui/RiskDot';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { proceduresApi, staffApi, type Procedure, type Department, type ApiUser } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

type SortDir = 'asc' | 'desc' | null;

// ── Helpers ────────────────────────────────────────────────────────────────
function mapStreamTarget(streamTarget: string): 'staff-only' | 'patient' | 'both' {
  if (streamTarget === 'B') return 'staff-only';
  if (streamTarget === 'A') return 'patient';
  return 'both';
}

function mapRiskLevel(riskLevel: string): 'critical' | 'high' | 'medium' | 'low' {
  const r = riskLevel?.toLowerCase();
  if (r === 'critical') return 'critical';
  if (r === 'high') return 'high';
  if (r === 'low') return 'low';
  return 'medium';
}

function mapStatus(status: string): 'draft' | 'pending' | 'approved' | 'published' | 'archived' {
  const s = status?.toLowerCase();
  if (s === 'draft') return 'draft';
  if (s === 'pending' || s === 'pending_approval') return 'pending';
  if (s === 'approved') return 'approved';
  if (s === 'published') return 'published';
  if (s === 'archived') return 'archived';
  return 'draft';
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    return `${Math.floor(diffDays / 7)} weeks ago`;
  } catch {
    return dateStr;
  }
}

interface DisplayProcedure {
  id: string;
  title: string;
  summary: string;
  department: string;
  stream: 'staff-only' | 'patient' | 'both';
  risk: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'pending' | 'approved' | 'published' | 'archived';
  version: string;
  updated: string;
  document_url: string | null;
}

const ITEMS_PER_PAGE = 10;

function CreateProcedureModal({
  departments,
  approvers,
  onClose,
  onCreated,
}: {
  departments: Department[];
  approvers: ApiUser[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    department_id: '',
    stream_target: 'both',
    risk_level: 'low',
    language: 'EN',
    document_url: '',
  });
  const [approverIds, setApproverIds] = useState<string[]>([]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleApprover = (id: string) => {
    setApproverIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const handleImportDocument = async (file: File | undefined) => {
    if (!file) return;
    if (file.type === 'application/pdf') {
      set('title', form.title || file.name.replace(/\.pdf$/i, ''));
      toast.info('PDF selected. Paste the Google Drive or hosted PDF link below, then paste the procedure text if needed.');
      return;
    }
    const text = await file.text();
    set('content', text);
    set('title', form.title || file.name.replace(/\.[^.]+$/, ''));
    toast.success('Document content imported.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    if (approverIds.length === 0) {
      toast.error('Select at least one staff reviewer.');
      return;
    }
    setLoading(true);
    try {
      await proceduresApi.create({
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        content: form.content.trim(),
        department_id: form.department_id || undefined,
        stream_target: form.stream_target,
        risk_level: form.risk_level,
        language: form.language,
        document_url: form.document_url.trim() || undefined,
        steps: [],
        compliance_annotations: [],
        knowledge_domain: 'clinical_procedure',
        applicable_roles: [],
        approver_ids: approverIds,
      });
      toast.success('Procedure submitted to selected approvers.');
      onCreated();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create procedure.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-lg shadow-card-lg w-full max-w-lg" style={{ borderRadius: '12px' }}>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-bold text-foreground" style={{ fontSize: '18px' }}>New Procedure</h2>
            <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Title <span className="text-clinical-red">*</span></label>
              <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Procedure title…" className="px-3 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Summary</label>
              <input type="text" value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Brief summary (optional)…" className="px-3 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Content / Description <span className="text-clinical-red">*</span></label>
              <textarea value={form.content} onChange={(e) => set('content', e.target.value)} placeholder="Full procedure content…" rows={5} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" style={{ fontSize: '13px' }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Hosted document link</label>
                <input type="url" value={form.document_url} onChange={(e) => set('document_url', e.target.value)} placeholder="PDF or Google Drive link" className="px-3 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }} />
              </div>
              <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-sm border border-border bg-card text-foreground hover:bg-muted cursor-pointer transition-colors" style={{ fontSize: '13px' }}>
                <Upload size={14} />
                Import
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    void handleImportDocument(e.target.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Department</label>
                <select value={form.department_id} onChange={(e) => set('department_id', e.target.value)} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
                  <option value="">All / General</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Stream Target</label>
                <select value={form.stream_target} onChange={(e) => set('stream_target', e.target.value)} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
                  <option value="both">Both</option>
                  <option value="A">Patient (A)</option>
                  <option value="B">Staff only (B)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Risk Level</label>
                <select value={form.risk_level} onChange={(e) => set('risk_level', e.target.value)} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Language</label>
                <select value={form.language} onChange={(e) => set('language', e.target.value)} className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ fontSize: '13px' }}>
                  <option value="EN">English</option>
                  <option value="FR">French</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Requested reviewers <span className="text-clinical-red">*</span></label>
              <div className="border border-border rounded-sm bg-card max-h-40 overflow-y-auto">
                {approvers.length === 0 ? (
                  <p className="px-3 py-2 text-muted-foreground" style={{ fontSize: '13px' }}>No active staff reviewers are available.</p>
                ) : (
                  approvers.map((person) => (
                    <label key={person.id} className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/60">
                      <input
                        type="checkbox"
                        checked={approverIds.includes(person.id)}
                        onChange={() => toggleApprover(person.id)}
                        className="h-4 w-4"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium text-foreground truncate" style={{ fontSize: '13px' }}>{person.full_name}</span>
                        <span className="block text-muted-foreground truncate" style={{ fontSize: '12px' }}>{person.role}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <p className="text-muted-foreground" style={{ fontSize: '12px' }}>Procedure will appear in Approvals while the selected reviewers make their decision.</p>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-sm border border-border text-foreground hover:bg-muted transition-colors font-medium" style={{ fontSize: '13px' }}>Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-sm bg-primary text-white font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center gap-2" style={{ fontSize: '13px' }}>
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProceduresContent() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [status, setStatus] = useState('All Status');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canCreateProcedure = ['super_admin', 'admin', 'department_admin', 'department_head'].includes(user?.role ?? '');

  // Fetch departments for filter dropdown
  const { data: departmentsData } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => proceduresApi.listDepartments(true),
    staleTime: 5 * 60_000,
  });

  const { data: staffData } = useQuery({
    queryKey: ['procedure-approvers'],
    queryFn: () => staffApi.list({ limit: 500 }),
    enabled: canCreateProcedure,
    staleTime: 5 * 60_000,
  });

  // Fetch all procedures (large limit for client-side filter/sort/page)
  const { data: proceduresData, isLoading, error } = useQuery({
    queryKey: ['procedures'],
    queryFn: () => proceduresApi.list({ limit: 200 }),
  });

  // Build dept id→name map
  const deptMap = useMemo(() => {
    const m: Record<string, string> = {};
    (departmentsData ?? []).forEach((d) => { m[d.id] = d.name; });
    return m;
  }, [departmentsData]);

  // Map backend procedures to display format
  const allProcedures: DisplayProcedure[] = useMemo(() => {
    return (proceduresData?.items ?? []).map((p: Procedure) => ({
      id: p.id,
      title: p.title,
      summary: p.summary ?? '',
      department: (p.department_id ? deptMap[p.department_id] : null) ?? p.department_id ?? '—',
      stream: mapStreamTarget(p.stream_target),
      risk: mapRiskLevel(p.risk_level),
      status: mapStatus(p.status),
      version: `v${p.version}`,
      updated: formatRelativeTime(p.updated_at),
      document_url: p.document_url ?? null,
    }));
  }, [proceduresData, deptMap]);

  // Build unique department names from real data
  const departments = useMemo(() => {
    const names = new Set<string>();
    allProcedures.forEach((p) => { if (p.department && p.department !== '—') names.add(p.department); });
    return ['All Departments', ...Array.from(names).sort()];
  }, [allProcedures]);

  const approvers = useMemo(() => {
    return (staffData?.items ?? []).filter((person: ApiUser) => person.role !== 'patient' && person.id !== user?.id && person.is_active);
  }, [staffData, user?.id]);

  const statuses = ['All Status', 'Draft', 'Pending', 'Approved', 'Published', 'Archived'];

  const filtered = useMemo(() => {
    return allProcedures.filter((p) => {
      const matchSearch =
        search === '' ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.department.toLowerCase().includes(search.toLowerCase());
      const matchDept = department === 'All Departments' || p.department === department;
      const matchStatus = status === 'All Status' || p.status === status.toLowerCase();
      return matchSearch && matchDept && matchStatus;
    });
  }, [allProcedures, search, department, status]);

  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, string>)[sortCol] ?? '';
      const bVal = (b as Record<string, string>)[sortCol] ?? '';
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const columns = [
    { key: 'title', label: 'Procedure', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'stream', label: 'Stream', sortable: false },
    { key: 'risk', label: 'Risk', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'version', label: 'Version', sortable: false },
    { key: 'updated', label: 'Updated', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false },
  ];

  return (
    <div>
      {showNewModal && (
        <CreateProcedureModal
          departments={departmentsData ?? []}
          approvers={approvers}
          onClose={() => setShowNewModal(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['procedures'] })}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-bold text-foreground" style={{ fontSize: '26px' }}>Procedures</h1>
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: '14px' }}>Knowledge base management</p>
        </div>
        {canCreateProcedure && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-sm bg-primary text-white hover:bg-primary-hover transition-all duration-150 active:scale-95"
              style={{ fontSize: '13px' }}
            >
              <Plus size={14} />
              New Procedure
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search procedures…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-sm bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            style={{ fontSize: '14px' }}
          />
        </div>
        <select
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          style={{ fontSize: '13px' }}
        >
          {departments.map((d) => <option key={`dept-${d}`}>{d}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          style={{ fontSize: '13px' }}
        >
          {statuses.map((s) => <option key={`status-opt-${s}`}>{s}</option>)}
        </select>
        <span className="label-meta text-muted-foreground whitespace-nowrap px-1">{filtered.length} procedures</span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-md shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm border-b border-border">
              <tr>
                {columns.map((col) => (
                  <th
                    key={`col-${col.key}`}
                    className={`px-4 py-3 text-left label-meta text-muted-foreground whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <span className="flex flex-col">
                          <ChevronUp size={9} className={sortCol === col.key && sortDir === 'asc' ? 'text-primary' : 'text-border'} />
                          <ChevronDown size={9} className={sortCol === col.key && sortDir === 'desc' ? 'text-primary' : 'text-border'} />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-border">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" style={{ width: col.key === 'title' ? '160px' : '80px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-clinical-red" style={{ fontSize: '14px' }}>
                    Failed to load procedures. Please try again.
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<ClipboardList size={48} />}
                      title="No procedures found"
                      description="Try a different search term or adjust your filters."
                      action={
                        <button
                          onClick={() => { setSearch(''); setDepartment('All Departments'); setStatus('All Status'); }}
                          className="px-3 py-1.5 rounded-sm border border-border text-muted-foreground hover:bg-muted transition-colors"
                          style={{ fontSize: '13px' }}
                        >
                          Clear filters
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((proc, idx) => (
                  <tr
                    key={proc.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                    style={{ backgroundColor: idx % 2 === 1 ? '#F8FAFF' : undefined }}
                  >
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="flex items-start gap-2">
                        <RiskDot level={proc.risk} className="mt-1.5" />
                        <div>
                          <p className="font-semibold text-foreground" style={{ fontSize: '13px' }}>{proc.title}</p>
                          <p className="text-muted-foreground truncate max-w-[200px]" style={{ fontSize: '11px' }}>{proc.summary}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground" style={{ fontSize: '13px' }}>{proc.department}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={proc.stream}>{proc.stream === 'staff-only' ? 'Staff Only' : proc.stream === 'both' ? 'Both' : 'Patient'}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={proc.risk}>{proc.risk.charAt(0).toUpperCase() + proc.risk.slice(1)}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={proc.status}>{proc.status.charAt(0).toUpperCase() + proc.status.slice(1)}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono-clinical text-muted-foreground">{proc.version}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground" style={{ fontSize: '12px' }}>{proc.updated}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button className="text-primary hover:underline font-medium" style={{ fontSize: '12px' }}>View</button>
                        <button className="text-muted-foreground hover:text-foreground" style={{ fontSize: '12px' }}>Edit</button>
                        {proc.document_url && (
                          <a
                            href={proc.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 font-medium hover:underline"
                            style={{ fontSize: '12px', color: 'var(--warning, #D97706)' }}
                            title="Open source PDF"
                          >
                            <FileText size={11} /> PDF
                          </a>
                        )}
                        <button className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-colors">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && paginated.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t border-border gap-3">
            <span className="text-muted-foreground" style={{ fontSize: '13px' }}>
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, sorted.length)} of {sorted.length} procedures
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-sm border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                style={{ fontSize: '13px' }}
              >
                ← Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={`page-${p}`}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-sm flex items-center justify-center font-medium transition-colors ${
                    p === page ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted border border-border'
                  }`}
                  style={{ fontSize: '13px' }}
                >
                  {p}
                </button>
              ))}
              {totalPages > 7 && <span className="text-muted-foreground px-1">…</span>}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-sm border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                style={{ fontSize: '13px' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
