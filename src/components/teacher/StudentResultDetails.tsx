import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Target, 
  User,
  FileText,
  Flag,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface StudentResultDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  studentName: string;
}

interface QuestionResponse {
  id: string;
  question_id: string;
  question_text: string;
  selected_option_id?: string;
  text_answer?: string;
  is_correct: boolean;
  points_earned: number;
  time_spent_seconds: number;
  is_flagged: boolean;
  answered_at: string;
  options: Array<{
    id: string;
    option_text: string;
    is_correct: boolean;
    is_selected: boolean;
  }>;
}

export const StudentResultDetails: React.FC<StudentResultDetailsProps> = ({
  isOpen,
  onClose,
  sessionId,
  studentName
}) => {
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchStudentResults();
    }
  }, [isOpen, sessionId]);

  const fetchStudentResults = async () => {
    try {
      setLoading(true);

      // Fetch session details
      const { data: session, error: sessionError } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          exams(title, duration_minutes, pass_mark)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSessionDetails(session);

      // Fetch detailed responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('question_responses')
        .select(`
          *,
          questions(
            question_text,
            question_type,
            explanation
          )
        `)
        .eq('session_id', sessionId)
        .order('answered_at');

      if (responsesError) throw responsesError;

      // Fetch options for each question
      const questionIds = responsesData.map(r => r.question_id);
      const { data: optionsData } = await supabase
        .from('question_options')
        .select('*')
        .in('question_id', questionIds)
        .order('option_order');

      // Group options by question
      const optionsByQuestion = optionsData?.reduce((acc, option) => {
        if (!acc[option.question_id]) acc[option.question_id] = [];
        acc[option.question_id].push(option);
        return acc;
      }, {} as Record<string, any[]>) || {};

      // Format responses with options
      const formattedResponses = responsesData.map(response => ({
        ...response,
        question_text: response.questions?.question_text || '',
        options: (optionsByQuestion[response.question_id] || []).map(opt => ({
          ...opt,
          is_selected: opt.id === response.selected_option_id
        }))
      }));

      setResponses(formattedResponses);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch student results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-destructive';
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex justify-center p-8">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            {studentName} - Exam Results
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Summary */}
          {sessionDetails && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(sessionDetails.percentage || 0)}`}>
                    {sessionDetails.percentage?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Final Score</div>
                  <Progress value={sessionDetails.percentage || 0} className="mt-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">
                    {sessionDetails.total_score || 0}/{sessionDetails.max_score || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Points</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center">
                    <Clock className="h-5 w-5 mr-2" />
                    <span className="text-lg font-bold">
                      {sessionDetails.started_at && sessionDetails.ended_at 
                        ? formatTime(Math.floor((new Date(sessionDetails.ended_at).getTime() - new Date(sessionDetails.started_at).getTime()) / 1000))
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Time Taken</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Badge 
                    variant={sessionDetails.passed ? "default" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {sessionDetails.passed ? 'PASSED' : 'FAILED'}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-2">
                    Pass Mark: {sessionDetails.exams?.pass_mark || 50}%
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Question-by-Question Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Question Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {responses.map((response, index) => (
                    <div 
                      key={response.id}
                      className={`p-4 border rounded-lg ${
                        response.is_correct ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Question {index + 1}</span>
                          {response.is_flagged && (
                            <Flag className="h-4 w-4 text-warning" />
                          )}
                          {response.is_correct ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Points: {response.points_earned}</span>
                          <span>Time: {formatTime(response.time_spent_seconds)}</span>
                        </div>
                      </div>

                      <p className="font-medium mb-3">{response.question_text}</p>

                      {response.options.length > 0 ? (
                        <div className="space-y-2">
                          {response.options.map((option, optIndex) => (
                            <div 
                              key={option.id}
                              className={`p-2 rounded flex items-center space-x-2 ${
                                option.is_correct 
                                  ? 'bg-success/10 border border-success/20' 
                                  : option.is_selected 
                                  ? 'bg-destructive/10 border border-destructive/20'
                                  : 'bg-muted/50'
                              }`}
                            >
                              <span className="font-medium w-6">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <span className="flex-1">{option.option_text}</span>
                              <div className="flex items-center space-x-2">
                                {option.is_correct && (
                                  <Badge variant="default" className="text-xs">Correct</Badge>
                                )}
                                {option.is_selected && (
                                  <Badge variant="outline" className="text-xs">Selected</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : response.text_answer && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">Student Answer:</p>
                          <p className="p-2 bg-muted rounded text-sm">{response.text_answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};