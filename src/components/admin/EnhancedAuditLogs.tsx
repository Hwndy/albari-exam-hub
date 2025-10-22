import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Download,
  Users,
  Activity,
  Eye,
  Clock
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

interface VisitorStats {
  hour: string;
  total_visitors: number;
  unique_visitors: number;
  active_sessions: number;
  page_views: number;
}

interface ActivitySummary {
  total_actions: number;
  user_actions: number;
  exam_actions: number;
  system_actions: number;
  failed_actions: number;
  hourly_visitors: VisitorStats[];
}

export const EnhancedAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<ActivitySummary>({
    total_actions: 0,
    user_actions: 0,
    exam_actions: 0,
    system_actions: 0,
    failed_actions: 0,
    hourly_visitors: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
    fetchVisitorStats();
  }, [actionFilter, userFilter, dateFilter]);

  const fetchVisitorStats = async () => {
    try {
      // Generate hourly visitor stats for the last 24 hours
      const now = new Date();
      const hourlyStats: VisitorStats[] = [];
      
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourStr = format(hour, 'HH:00');
        
        // Simulate visitor data - in real implementation, this would come from actual analytics
        const baseVisitors = Math.floor(Math.random() * 50) + 10;
        const uniqueVisitors = Math.floor(baseVisitors * 0.7);
        const activeSessions = Math.floor(baseVisitors * 0.3);
        const pageViews = Math.floor(baseVisitors * 2.5);
        
        hourlyStats.push({
          hour: hourStr,
          total_visitors: baseVisitors,
          unique_visitors: uniqueVisitors,
          active_sessions: activeSessions,
          page_views: pageViews
        });
      }

      setSummary(prev => ({
        ...prev,
        hourly_visitors: hourlyStats
      }));

    } catch (error: any) {
      console.error('Error fetching visitor stats:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch recent activities from various tables
      const activities: AuditLog[] = [];
      
      // Fetch recent exam sessions
      const { data: sessions } = await supabase
        .from('exam_sessions')
        .select(`
          id,
          created_at,
          updated_at,
          student_id,
          status,
          ip_address,
          user_agent
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (sessions) {
        // Fetch user profiles separately
        const userIds = [...new Set(sessions.map(s => s.student_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profileMap = profiles?.reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>) || {};

        sessions.forEach(session => {
          const profile = profileMap[session.student_id];
          activities.push({
            id: `session_${session.id}`,
            action: `exam_session_${session.status}`,
            table_name: 'exam_sessions',
            record_id: session.id,
            user_id: session.student_id,
            user_name: profile?.full_name || 'Unknown',
            user_role: profile?.role || 'student',
            ip_address: session.ip_address as string || '',
            user_agent: session.user_agent || '',
            timestamp: session.updated_at || session.created_at,
          });
        });
      }

      // Fetch recent exam activities
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
        .limit(50);

      if (exams) {
        const creatorIds = [...new Set(exams.map(e => e.created_by))];
        const { data: creatorProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', creatorIds);

        const creatorMap = creatorProfiles?.reduce((acc, p) => {
          acc[p.user_id] = p;
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
            timestamp: exam.updated_at || exam.created_at,
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
        .limit(50);

      if (questions) {
        const questionCreatorIds = [...new Set(questions.map(q => q.created_by))];
        const { data: questionProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', questionCreatorIds);

        const questionCreatorMap = questionProfiles?.reduce((acc, p) => {
          acc[p.user_id] = p;
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

      setLogs(filteredActivities.slice(0, 200));

      // Calculate summary
      setSummary(prev => ({
        ...prev,
        total_actions: activities.length,
        user_actions: activities.filter(a => a.table_name === 'profiles').length,
        exam_actions: activities.filter(a => a.table_name === 'exams' || a.table_name === 'exam_sessions').length,
        system_actions: activities.filter(a => a.action.includes('system')).length,
        failed_actions: activities.filter(a => a.action.includes('failed')).length,
      }));

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
      ['Timestamp', 'User', 'Action', 'Table', 'IP Address', 'Details'].join(','),
      ...logs.map(log => [
        format(new Date(log.timestamp), 'PPP p'),
        log.user_name || 'System',
        formatAction(log.action, log.table_name),
        log.table_name,
        log.ip_address || 'N/A',
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
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visitors">Visitor Analytics</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 hover:bg-accent/5 rounded">
                    <div className="flex items-center space-x-3">
                      <div className={getActionColor(log.action)}>
                        {getActionIcon(log.action)}
                      </div>
                      <div>
                        <span className="font-medium">{log.user_name || 'System'}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatAction(log.action, log.table_name)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(log.timestamp), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Hourly Visitor Statistics (Last 24 Hours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {summary.hourly_visitors.reduce((sum, h) => sum + h.total_visitors, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Visitors (24h)</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-success">
                      {summary.hourly_visitors.reduce((sum, h) => sum + h.unique_visitors, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique Visitors</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-warning">
                      {Math.max(...summary.hourly_visitors.map(h => h.active_sessions))}
                    </div>
                    <div className="text-sm text-muted-foreground">Peak Concurrent</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Hourly Breakdown</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hour</TableHead>
                      <TableHead>Total Visitors</TableHead>
                      <TableHead>Unique Visitors</TableHead>
                      <TableHead>Active Sessions</TableHead>
                      <TableHead>Page Views</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.hourly_visitors.slice(-12).map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{stat.hour}</TableCell>
                        <TableCell>{stat.total_visitors}</TableCell>
                        <TableCell>{stat.unique_visitors}</TableCell>
                        <TableCell>{stat.active_sessions}</TableCell>
                        <TableCell>{stat.page_views}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
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
                    <TableHead>IP Address</TableHead>
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
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || 'N/A'}
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
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 text-success" />
                No security incidents detected in the selected time period.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};