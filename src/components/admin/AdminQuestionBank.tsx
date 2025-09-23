import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Eye, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BulkQuestionImport } from './BulkQuestionImport';
import { QuestionCategorizer } from '../shared/QuestionCategorizer';
import { EnhancedQuestionForm } from '../shared/EnhancedQuestionForm';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'fill_blank' | 'diagram';
  difficulty_level: 'easy' | 'medium' | 'hard';
  points: number;
  options: QuestionOption[];
  explanation?: string;
  subject_name: string;
  class_name: string;
  created_at: string;
}

interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
}

interface QuestionFormData {
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'fill_blank' | 'diagram';
  options: Array<{id: string, text: string, isCorrect: boolean}>;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  explanation: string;
  mediaUrl: string;
  formulaLatex: string;
  subjectId: string;
  classId: string;
  correctAnswers: string[];
}

export const AdminQuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch questions with subject and class info
      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          *,
          question_options(*),
          question_banks(
            subject_id,
            class_id,
            subjects(name),
            classes(name)
          )
        `)
        .order('created_at', { ascending: false });

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      // Fetch classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (questionsData) {
        const formattedQuestions = questionsData.map(q => ({
          ...q,
          options: q.question_options?.sort((a: any, b: any) => a.option_order - b.option_order) || [],
          subject_name: q.question_banks?.subjects?.name || 'Unknown',
          class_name: q.question_banks?.classes?.name || 'All Classes'
        }));
        setQuestions(formattedQuestions);
        setFilteredQuestions(formattedQuestions);
      }
      
      if (subjectsData) setSubjects(subjectsData);
      if (classesData) setClasses(classesData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (questionData: QuestionFormData) => {
    try {
      // Find existing question bank or create new one for this subject and class
      let questionBankId = null;
      
      const { data: existingBanks } = await supabase
        .from('question_banks')
        .select('id')
        .eq('subject_id', questionData.subjectId)
        .eq('class_id', questionData.classId)
        .limit(1);

      if (existingBanks && existingBanks.length > 0) {
        questionBankId = existingBanks[0].id;
      } else {
        // Create new question bank
        const subject = subjects.find(s => s.id === questionData.subjectId);
        const cls = classes.find(c => c.id === questionData.classId);
        
        const { data: newQuestionBank, error: bankError } = await supabase
          .from('question_banks')
          .insert({
            name: `${subject?.name} - ${cls?.name || 'General'} Questions`,
            subject_id: questionData.subjectId,
            class_id: questionData.classId,
            created_by: user?.id,
          })
          .select()
          .single();

        if (bankError) throw bankError;
        questionBankId = newQuestionBank?.id;
      }

      // Insert question
      const { data: newQuestion, error: questionError } = await supabase
        .from('questions')
        .insert({
          question_text: questionData.questionText,
          question_type: questionData.questionType,
          difficulty_level: questionData.difficulty,
          points: questionData.points,
          explanation: questionData.explanation,
          media_url: questionData.mediaUrl || null,
          formula_latex: questionData.formulaLatex || null,
          question_bank_id: questionBankId,
          class_id: questionData.classId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Insert question options
      if (questionData.questionType === 'mcq' || questionData.questionType === 'true_false') {
        const optionsData = questionData.options.map((option, index) => ({
          question_id: newQuestion.id,
          option_text: option.text,
          is_correct: option.isCorrect,
          option_order: index + 1,
        }));

        const { error: optionsError } = await supabase
          .from('question_options')
          .insert(optionsData);

        if (optionsError) throw optionsError;
      } else if (questionData.questionType === 'fill_blank') {
        const correctAnswersData = questionData.correctAnswers.map((answer, index) => ({
          question_id: newQuestion.id,
          option_text: answer,
          is_correct: true,
          option_order: index + 1,
        }));

        const { error: optionsError } = await supabase
          .from('question_options')
          .insert(correctAnswersData);

        if (optionsError) throw optionsError;
      }

      await fetchData();
      
      toast({
        title: 'Question Added',
        description: 'Question has been added successfully.',
      });
    } catch (error: any) {
      console.error('Error adding question:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add question',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      await fetchData();
      
      toast({
        title: 'Question Deleted',
        description: 'Question has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete question',
        variant: 'destructive',
      });
    }
  };


  const handleFilterChange = (filtered: Question[]) => {
    setFilteredQuestions(filtered);
  };

  const getStats = () => {
    return {
      total: questions.length,
      easy: questions.filter(q => q.difficulty_level === 'easy').length,
      medium: questions.filter(q => q.difficulty_level === 'medium').length,
      hard: questions.filter(q => q.difficulty_level === 'hard').length,
    };
  };

  const stats = getStats();

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Question Bank Management</h2>
          <p className="text-muted-foreground">Create and manage questions for all subjects and classes</p>
        </div>
        <Dialog open={isAddingQuestion} onOpenChange={setIsAddingQuestion}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Question</DialogTitle>
            </DialogHeader>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant={!bulkMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkMode(false)}
                >
                  Single Question
                </Button>
                <Button
                  type="button"
                  variant={bulkMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBulkMode(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Import
                </Button>
              </div>
            </div>

            {bulkMode ? (
              <BulkQuestionImport
                subjects={subjects}
                classes={classes}
                onComplete={() => {
                  fetchData();
                  setIsAddingQuestion(false);
                  setBulkMode(false);
                }}
                onCancel={() => setIsAddingQuestion(false)}
              />
            ) : (
              <EnhancedQuestionForm
                onAddQuestion={handleAddQuestion}
                classes={classes}
                subjects={subjects}
                onCancel={() => setIsAddingQuestion(false)}
                onSaveAndClose={() => setIsAddingQuestion(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.easy}</div>
            <div className="text-sm text-muted-foreground">Easy</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{stats.medium}</div>
            <div className="text-sm text-muted-foreground">Medium</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats.hard}</div>
            <div className="text-sm text-muted-foreground">Hard</div>
          </CardContent>
        </Card>
      </div>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({filteredQuestions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <div
                key={question.id}
                className="p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{question.subject_name}</Badge>
                      <Badge 
                        variant={
                          question.difficulty_level === 'easy' ? 'default' :
                          question.difficulty_level === 'medium' ? 'secondary' : 'destructive'
                        }
                      >
                        {question.difficulty_level}
                      </Badge>
                      <Badge variant="outline">{question.points} pts</Badge>
                    </div>
                    <p className="font-medium line-clamp-2">{question.question_text}</p>
                    <div className="text-sm text-muted-foreground">
                      {question.options.length > 0 && (
                        <span>{question.options.length} options • </span>
                      )}
                      Created: {new Date(question.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewQuestion(question)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No questions found for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Question Modal */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{previewQuestion.subject_name}</Badge>
                <Badge variant="outline">{previewQuestion.difficulty_level}</Badge>
                <Badge variant="outline">{previewQuestion.points} points</Badge>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{previewQuestion.question_text}</p>
              </div>

              {previewQuestion.options.length > 0 && (
                <div className="space-y-2">
                  <Label>Options:</Label>
                  {previewQuestion.options.map((option, index) => (
                    <div 
                      key={option.id}
                      className={`p-3 rounded border ${
                        option.is_correct ? 'border-success bg-success/10' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                        <span>{option.option_text}</span>
                        {option.is_correct && (
                          <Badge variant="default" className="ml-auto">Correct</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.explanation && (
                <div className="space-y-2">
                  <Label>Explanation:</Label>
                  <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    {previewQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};