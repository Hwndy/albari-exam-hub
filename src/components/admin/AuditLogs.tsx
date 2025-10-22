import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Shield, 
  User, 
  FileText, 
  Settings, 
  Search,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data?: any;
  new_data?: any;
  user_id: string;
  user_name?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

interface ActivitySummary {
  total_actions: number;
  user_actions: number;
  exam_actions: number;
  system_actions: number;
  failed_actions: number;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<ActivitySummary>({
    total_actions: 0,
    user_actions: 0,
    exam_actions: 0,
    system_actions: 0,
    failed_actions: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter, userFilter, dateFilter]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // For now, we'll simulate audit logs since we don't have a full audit system
      // In a real application, you would have proper audit log tables
      
      // Fetch recent activities from various tables
      const activities: AuditLog[] = [];
      
      // Fetch recent exam sessions
      const { data: sessions } = await supabase
        .from('exam_sessions')
        .select(`
          id,
          created_at,
          student_id,
          status
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (sessions) {
        // Fetch user profiles and roles separately
        const userIds = [...new Set(sessions.map(s => s.student_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        const profileMap = profiles?.reduce((acc, p) => {
          const roleEntry = roles?.find(r => r.user_id === p.user_id);
          acc[p.user_id] = { ...p, role: roleEntry?.role || 'student' };
          return acc;
        }, {} as Record<string, any>) || {};

        sessions.forEach(session => {
          const profile = profileMap[session.student_id];
          activities.push({
            id: `session_${session.id}`,
            action: `exam_${session.status}`,
            table_name: 'exam_sessions',
            record_id: session.id,
            user_id: session.student_id,
            user_name: profile?.full_name || 'Unknown',
            user_role: profile?.role || 'student',
            timestamp: session.created_at,
          });
        });
      }

      // Fetch recent exam creations/updates
      const { data: exams } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          created_by,
          status
        `)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (exams) {
        // Fetch creator profiles and roles separately
        const creatorIds = [...new Set(exams.map(e => e.created_by))];
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', creatorIds);

        const { data: creatorRoles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', creatorIds);

        const creatorMap = creatorProfiles?.reduce((acc, p) => {
          const roleEntry = creatorRoles?.find(r => r.user_id === p.user_id);
          acc[p.user_id] = { ...p, role: roleEntry?.role || 'teacher' };
          return acc;
        }, {} as Record<string, any>) || {};

        exams.forEach(exam => {
          const creator = creatorMap[exam.created_by];
          activities.push({
            id: `exam_${exam.id}`,
            action: `exam_${exam.status}`,
            table_name: 'exams',
            record_id: exam.id,
            user_id: exam.created_by,
            user_name: creator?.full_name || 'Unknown',
            user_role: creator?.role || 'teacher',
            new_data: { title: exam.title, status: exam.status },
            timestamp: exam.updated_at,
          });
        });
      }

      // Fetch recent question activities
      const { data: questions } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          created_at,
          created_by
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (questions) {
        // Fetch question creator profiles and roles separately
        const questionCreatorIds = [...new Set(questions.map(q => q.created_by))];
        const { data: questionProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', questionCreatorIds);

        const { data: questionRoles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', questionCreatorIds);

        const questionCreatorMap = questionProfiles?.reduce((acc, p) => {
          const roleEntry = questionRoles?.find(r => r.user_id === p.user_id);
          acc[p.user_id] = { ...p, role: roleEntry?.role || 'teacher' };
          return acc;
        }, {} as Record<string, any>) || {};

        questions.forEach(question => {
          const creator = questionCreatorMap[question.created_by];
          activities.push({
            id: `question_${question.id}`,
            action: 'question_created',
            table_name: 'questions',
            record_id: question.id,
            user_id: question.created_by,
            user_name: creator?.full_name || 'Unknown',
            user_role: creator?.role || 'teacher',
            new_data: { question_text: question.question_text.substring(0, 50) + '...' },
            timestamp: question.created_at,
          });
        });
      }

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply filters
      let filteredActivities = [...activities];

      if (actionFilter !== 'all') {
        filteredActivities = filteredActivities.filter(log => 
          log.action.includes(actionFilter)
        );
      }

      if (userFilter !== 'all') {
        filteredActivities = filteredActivities.filter(log => 
          log.user_role === userFilter
        );
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        const cutoff = new Date();
        
        switch (dateFilter) {
          case 'today':
            cutoff.setHours(0, 0, 0, 0);
            break;
          case 'week':
            cutoff.setDate(now.getDate() - 7);
            break;
          case 'month':
            cutoff.setMonth(now.getMonth() - 1);
            break;
        }
        
        filteredActivities = filteredActivities.filter(log => 
          new Date(log.timestamp) >= cutoff
        );
      }

      setLogs(filteredActivities.slice(0, 100)); // Limit to 100 recent logs

      // Calculate summary
      setSummary({
        total_actions: activities.length,
        user_actions: activities.filter(a => a.table_name === 'profiles').length,
        exam_actions: activities.filter(a => a.table_name === 'exams' || a.table_name === 'exam_sessions').length,
        system_actions: activities.filter(a => a.action.includes('system')).length,
        failed_actions: activities.filter(a => a.action.includes('failed')).length,
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('user') || action.includes('profile')) return <User className="h-4 w-4" />;
    if (action.includes('exam')) return <FileText className="h-4 w-4" />;
    if (action.includes('system')) return <Settings className="h-4 w-4" />;
    if (action.includes('failed')) return <XCircle className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('completed')) return 'text-success';
    if (action.includes('failed') || action.includes('deleted')) return 'text-destructive';
    if (action.includes('updated') || action.includes('in_progress')) return 'text-warning';
    return 'text-info';
  };

  const formatAction = (action: string, tableName: string) => {
    const parts = action.split('_');
    const actionType = parts[parts.length - 1];
    const entity = parts.slice(0, -1).join(' ') || tableName;
    
    return `${entity} ${actionType}`.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Table', 'Details'].join(','),
      ...logs.map(log => [
        format(new Date(log.timestamp), 'PPP p'),
        log.user_name || 'System',
        formatAction(log.action, log.table_name),
        log.table_name,
        log.new_data ? JSON.stringify(log.new_data) : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log =>
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.table_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.total_actions}</div>
            <div className="text-sm text-muted-foreground">Total Actions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-info">{summary.user_actions}</div>
            <div className="text-sm text-muted-foreground">User Actions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{summary.exam_actions}</div>
            <div className="text-sm text-muted-foreground">Exam Actions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{summary.system_actions}</div>
            <div className="text-sm text-muted-foreground">System Actions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{summary.failed_actions}</div>
            <div className="text-sm text-muted-foreground">Failed Actions</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="exam">Exams</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="question">Questions</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="User Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={exportLogs} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{log.user_name || 'System'}</div>
                      <Badge variant="secondary" className="text-xs">
                        {log.user_role || 'system'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center space-x-2 ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                      <span className="font-medium">
                        {formatAction(log.action, log.table_name)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.table_name}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {log.new_data && (
                      <div className="text-sm text-muted-foreground truncate">
                        {typeof log.new_data === 'object' 
                          ? Object.entries(log.new_data).map(([key, value]) => 
                              `${key}: ${value}`
                            ).join(', ')
                          : log.new_data
                        }
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No logs found for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};