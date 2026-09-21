import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, Loader2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  domain: string | null;
  table_name: string | null;
  row_id: string | null;
  before_data: unknown;
  after_data: unknown;
  metadata: unknown;
  created_at: string;
  total_count: number;
};

type ActorOption = {
  actor_id: string;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  event_count: number;
};

type Filters = {
  search: string;
  domain: string;
  action: string;
  role: string;
  actorId: string;
  from: string;
  to: string;
};

const initialFilters: Filters = {
  search: '', domain: 'all', action: 'all', role: 'all', actorId: 'all', from: '', to: '',
};

const domains = [
  ['admissions', 'Admissions'], ['payments', 'Payments'], ['results', 'Results'],
  ['attendance', 'Attendance'], ['timetables', 'Timetables'], ['staff_accounts', 'Staff accounts'],
];

const roles = ['admin', 'teacher', 'student', 'parent'];
const actions = ['insert', 'update', 'delete'];

function labelize(value: string | null | undefined) {
  return (value ?? 'system').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayActor(row: Pick<AuditRow, 'actor_name' | 'actor_email' | 'actor_id'>) {
  return row.actor_name || row.actor_email || (row.actor_id ? `${row.actor_id.slice(0, 8)}…` : 'System');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function changedFields(row: AuditRow) {
  const before = jsonRecord(row.before_data);
  const after = jsonRecord(row.after_data);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).filter((key) => key !== 'id');
}

function csvCell(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function SystemAuditLog() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [actors, setActors] = useState<ActorOption[]>([]);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const totalCount = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(filters.search);
      setPage(0);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const rpcFilters = useCallback((offset: number) => ({
    p_search: appliedSearch.trim() || undefined,
    p_domain: filters.domain === 'all' ? undefined : filters.domain,
    p_action: filters.action === 'all' ? undefined : filters.action,
    p_role: filters.role === 'all' ? undefined : filters.role,
    p_actor_id: filters.actorId === 'all' ? undefined : filters.actorId,
    p_from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
    p_to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
    p_limit: pageSize,
    p_offset: offset,
  }), [appliedSearch, filters, pageSize]);

  const loadActors = useCallback(async () => {
    const { data, error: actorsError } = await supabase.rpc('get_audit_log_actors');
    if (actorsError) throw actorsError;
    setActors((data ?? []) as ActorOption[]);
  }, []);

  const loadRows = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    const { data, error: rowsError } = await supabase.rpc('get_audit_logs', rpcFilters(page * pageSize));
    if (rowsError) {
      setError(rowsError.message);
      if (showSpinner) setLoading(false);
      return;
    }
    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  }, [page, pageSize, rpcFilters]);

  useEffect(() => {
    void Promise.all([loadRows(), loadActors()]).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load audit history.');
      setLoading(false);
    });
  }, [loadActors, loadRows]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key !== 'search') setPage(0);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setAppliedSearch('');
    setPage(0);
  };

  const exportLogs = async () => {
    setExporting(true);
    try {
      const exported: AuditRow[] = [];
      let offset = 0;
      let expected = 0;
      do {
        const { data, error: exportError } = await supabase.rpc('get_audit_logs', {
          ...rpcFilters(offset), p_limit: 200, p_offset: offset,
        });
        if (exportError) throw exportError;
        const batch = (data ?? []) as AuditRow[];
        exported.push(...batch);
        expected = batch[0]?.total_count ?? exported.length;
        offset += batch.length;
        if (!batch.length) break;
      } while (exported.length < expected);

      const header = ['Timestamp', 'Actor', 'Email', 'Role', 'Action', 'Domain', 'Table', 'Record', 'Changed fields'];
      const lines = exported.map((row) => [
        row.created_at, displayActor(row), row.actor_email ?? '', row.actor_role ?? 'system', row.action,
        row.domain ?? 'system', row.table_name ?? '', row.row_id ?? '', changedFields(row).join(', '),
      ].map(csvCell).join(','));
      const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError: unknown) {
      toast({ title: 'Export failed', description: exportError instanceof Error ? exportError.message : 'Unable to export audit history.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const actorOptions = useMemo(() => actors.map((actor) => ({
    ...actor,
    label: `${actor.actor_name || actor.actor_email || 'Unknown user'} · ${actor.event_count}`,
  })), [actors]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-2xl font-semibold">Audit log</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Review important changes across the school platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadRows()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" onClick={() => void exportLogs()} disabled={exporting || loading}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <div className="space-y-1 xl:col-span-2">
            <Label htmlFor="audit-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="audit-search" className="pl-9" placeholder="Search people, records, or details" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Area</Label>
            <Select value={filters.domain} onValueChange={(value) => updateFilter('domain', value)}>
              <SelectTrigger><SelectValue placeholder="All areas" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All areas</SelectItem>{domains.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Action</Label>
            <Select value={filters.action} onValueChange={(value) => updateFilter('action', value)}>
              <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All actions</SelectItem>{actions.map((value) => <SelectItem key={value} value={value}>{labelize(value)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={filters.role} onValueChange={(value) => updateFilter('role', value)}>
              <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map((value) => <SelectItem key={value} value={value}>{labelize(value)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 xl:col-span-2">
            <Label>User</Label>
            <Select value={filters.actorId} onValueChange={(value) => updateFilter('actorId', value)}>
              <SelectTrigger><SelectValue placeholder="All users" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All users</SelectItem>{actorOptions.map((actor) => <SelectItem key={actor.actor_id} value={actor.actor_id}>{actor.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-from">From</Label>
            <Input id="audit-from" type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-to">To</Label>
            <Input id="audit-to" type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" className="w-full" onClick={clearFilters}>Clear filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent changes</CardTitle>
          <span className="text-sm text-muted-foreground">{totalCount.toLocaleString()} records</span>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="m-6 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading audit history…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No changes match these filters.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Area</TableHead><TableHead>Record</TableHead><TableHead>Changed</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
              <TableBody>{rows.map((row) => {
                const fields = changedFields(row);
                return <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                  <TableCell><div className="font-medium">{displayActor(row)}</div><div className="text-xs text-muted-foreground">{labelize(row.actor_role)}</div></TableCell>
                  <TableCell><Badge variant={row.action === 'delete' ? 'destructive' : row.action === 'insert' ? 'default' : 'secondary'}>{labelize(row.action)}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{labelize(row.domain)}</Badge></TableCell>
                  <TableCell><div className="font-medium">{labelize(row.table_name)}</div><div className="max-w-32 truncate text-xs text-muted-foreground">{row.row_id || '—'}</div></TableCell>
                  <TableCell className="max-w-52 truncate text-xs text-muted-foreground">{fields.length ? fields.slice(0, 3).join(', ') : 'Record event'}{fields.length > 3 ? ` +${fields.length - 3}` : ''}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" aria-label="View audit entry" title="View audit entry" onClick={() => setSelected(row)}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
          )}
          {!loading && totalPages > 1 && <div className="flex items-center justify-between border-t p-4"><span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>}
        </CardContent>
      </Card>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && <>
            <SheetHeader><SheetTitle>Audit entry</SheetTitle><SheetDescription>{formatDate(selected.created_at)} · {labelize(selected.domain)}</SheetDescription></SheetHeader>
            <div className="mt-6 space-y-5 text-sm">
              <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-muted-foreground">Actor</p><p className="font-medium">{displayActor(selected)}</p><p className="text-xs text-muted-foreground">{selected.actor_email || selected.actor_id || 'System event'}</p></div><div><p className="text-muted-foreground">Role and action</p><p className="font-medium">{labelize(selected.actor_role)} · {labelize(selected.action)}</p></div><div><p className="text-muted-foreground">Affected table</p><p className="font-medium">{labelize(selected.table_name)}</p></div><div><p className="text-muted-foreground">Record ID</p><p className="break-all font-mono text-xs">{selected.row_id || 'Not supplied'}</p></div></div>
              <div><p className="mb-2 font-medium">Changed fields</p><div className="flex flex-wrap gap-2">{changedFields(selected).length ? changedFields(selected).map((field) => <Badge key={field} variant="outline">{field}</Badge>) : <span className="text-muted-foreground">No field diff available.</span>}</div></div>
              <div><p className="mb-2 font-medium">Before</p><pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(selected.before_data ?? {}, null, 2)}</pre></div>
              <div><p className="mb-2 font-medium">After</p><pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(selected.after_data ?? {}, null, 2)}</pre></div>
            </div>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default SystemAuditLog;