import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Eye,
  UserX,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LiveSession {
  id: string;
  student_id: string;
  student_name: string;
  exam_title: string;
  status: string;
  started_at: string;
  time_remaining_seconds: number;
  current_question_index: number;
  total_questions: number;
  ip_address?: string;
  user_agent?: string;
}

export const LiveExamMonitor: React.FC = () => {
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspiciousActivity, setSuspiciousActivity] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchLiveSessions();
    fetchExams();
    
    // Set up real-time subscription for live sessions
    const channel = supabase
      .channel('live-exam-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_sessions',
          filter: 'status=eq.in_progress'
        },
        () => {
          fetchLiveSessions();
        }
      )
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchLiveSessions();
    }, 30000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchLiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          exams!inner(title, total_questions),
          profiles!inner(full_name)
        `)
        .eq('status', 'in_progress');

      if (error) throw error;

      const formattedSessions = data?.map((session: any) => ({
        id: session.id,
        student_id: session.student_id,
        student_name: session.profiles.full_name,
        exam_title: session.exams.title,
        status: session.status,
        started_at: session.started_at,
        time_remaining_seconds: session.time_remaining_seconds || 0,
        current_question_index: session.current_question_index || 0,
        total_questions: session.exams.total_questions,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
      })) || [];

      setLiveSessions(formattedSessions);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch live sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, status')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      console.error('Failed to fetch exams:', error);
    }
  };

  const terminateSession = async (sessionId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to terminate ${studentName}'s exam session?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('exam_sessions')
        .update({ 
          status: 'completed', // Use 'completed' instead of 'terminated'
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: 'Session Terminated',
        description: `${studentName}'s exam session has been terminated.`,
      });

      fetchLiveSessions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to terminate session',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = (timeRemaining: number) => {
    if (timeRemaining < 300) return 'destructive'; // Less than 5 minutes
    if (timeRemaining < 600) return 'default'; // Less than 10 minutes
    return 'secondary';
  };

  const filteredSessions = selectedExam === 'all' 
    ? liveSessions 
    : liveSessions.filter(session => session.exam_title === selectedExam);

  if (loading) {
    return <div className="flex justify-center p-8">Loading live sessions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{liveSessions.length}</div>
                <div className="text-sm text-muted-foreground">Active Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-success" />
              <div>
                <div className="text-2xl font-bold">
                  {liveSessions.filter(s => s.time_remaining_seconds > 300).length}
                </div>
                <div className="text-sm text-muted-foreground">Stable Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <div className="text-2xl font-bold">
                  {liveSessions.filter(s => s.time_remaining_seconds <= 300).length}
                </div>
                <div className="text-sm text-muted-foreground">Critical Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-2xl font-bold">{suspiciousActivity.length}</div>
                <div className="text-sm text-muted-foreground">Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Live Exam Sessions
            </CardTitle>
            <div className="flex items-center space-x-2">
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="all">All Exams</option>
                {exams.map(exam => (
                  <option key={exam.id} value={exam.title}>
                    {exam.title}
                  </option>
                ))}
              </select>
              <Badge variant="outline">
                Live: {filteredSessions.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active exam sessions
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{session.student_name}</span>
                        <Badge variant="outline">{session.exam_title}</Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Question {session.current_question_index + 1} of {session.total_questions}</span>
                        <span>Started: {new Date(session.started_at).toLocaleTimeString()}</span>
                        {session.ip_address && (
                          <span>IP: {session.ip_address}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <Badge variant={getStatusColor(session.time_remaining_seconds)}>
                          {formatTime(session.time_remaining_seconds)}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">Remaining</div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => terminateSession(session.id, session.student_name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Terminate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Suspicious Activity Alerts */}
      {suspiciousActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suspiciousActivity.map((alert, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{alert.student_name}</strong>: {alert.description}
                    <span className="text-xs ml-2">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};