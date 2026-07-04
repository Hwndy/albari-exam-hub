import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  X,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
interface ExamPreviewProps {
  examId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PreviewQuestion {
  id: string;
  question_text: string;
  question_type: string;
  difficulty_level: string;
  points: number;
  options: any[];
  media_url?: string;
  explanation?: string;
}

export const ExamPreview: React.FC<ExamPreviewProps> = ({ examId, isOpen, onClose }) => {
  const [examData, setExamData] = useState<any>(null);
  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  useEffect(() => {
    if (isOpen && examId) {
      fetchExamPreview();
    }
  }, [isOpen, examId]);

  const fetchExamPreview = async () => {
    try {
      setLoading(true);
      
      // Fetch exam details
      const { data: examData, error: examError } = await 
        supabase
          .from('exams')
          .select(`
            *,
            subjects(name),
            classes(name)
          `)
          .eq('id', examId)
      .single();

      if (examError) throw examError;

      // Fetch questions with options
      const { data: questionsData, error: questionsError } = await supabase
        .from('exam_questions')
        .select(`
          *,
          questions!inner(
            *,
            question_options(*)
          )
        `)
        .eq('exam_id', examId)
        .order('question_order');

      if (questionsError) throw questionsError;

      const formattedQuestions = questionsData?.map((eq: any) => ({
        ...eq.questions,
        points: eq.points,
        options: eq.questions.question_options?.sort((a: any, b: any) => a.option_order - b.option_order) || []
      })) || [];

      setExamData(examData);
      setQuestions(formattedQuestions);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load exam preview',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'true_false': return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'fill_blank': return <FileText className="h-4 w-4 text-info" />;
      default: return <CheckCircle2 className="h-4 w-4 text-primary" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'hard': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Exam Preview</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-100px)]">
          <div className="space-y-6 p-4">
            {/* Exam Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{examData?.title}</CardTitle>
                    <p className="text-muted-foreground mt-1">{examData?.description}</p>
                  </div>
                  <Badge variant="outline" className="ml-4">
                    <Eye className="h-3 w-3 mr-1" />
                    Preview Mode
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{questions.length}</div>
                    <div className="text-sm text-muted-foreground">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{examData?.duration_minutes}</div>
                    <div className="text-sm text-muted-foreground">Minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{examData?.pass_mark}%</div>
                    <div className="text-sm text-muted-foreground">Pass Mark</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {questions.reduce((sum, q) => sum + q.points, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Points</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Questions</h3>
              {questions.map((question, index) => (
                <Card key={question.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getQuestionTypeIcon(question.question_type)}
                        <span className="font-medium">Question {index + 1}</span>
                        <Badge className={getDifficultyColor(question.difficulty_level)}>
                          {question.difficulty_level}
                        </Badge>
                        <Badge variant="outline">{question.points} pts</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base font-medium mb-4">{question.question_text}</p>
                    
                    {/* Media Support */}
                    {question.media_url && (
                      <div className="mb-4">
                        {question.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img 
                            src={question.media_url} 
                            alt="Question media" 
                            className="max-w-sm h-auto rounded border"
                          />
                        ) : question.media_url.match(/\.(mp3|wav|ogg)$/i) ? (
                          <audio controls className="w-full max-w-sm">
                            <source src={question.media_url} />
                          </audio>
                        ) : null}
                      </div>
                    )}

                    {/* Options */}
                    {question.options.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Options:</div>
                        {question.options.map((option: any) => (
                          <div 
                            key={option.id} 
                            className={`flex items-center space-x-2 p-2 rounded border ${
                              option.is_correct ? 'bg-success/10 border-success' : ''
                            }`}
                          >
                            <span className="font-medium text-sm">
                              {String.fromCharCode(64 + option.option_order)}.
                            </span>
                            <span>{option.option_text}</span>
                            {option.is_correct && (
                              <CheckCircle2 className="h-4 w-4 text-success ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="mt-4 p-3 bg-muted rounded">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Explanation:</div>
                        <p className="text-sm">{question.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};