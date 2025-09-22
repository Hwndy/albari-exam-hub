import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { StaticFormLayout } from '@/components/layout/StaticFormLayout';
import { EnhancedQuestionForm } from '@/components/shared/EnhancedQuestionForm';
import { CheckCircle, FileText, Plus, Edit, Trash2 } from 'lucide-react';

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

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get teacher's assignments for both classes and subjects
      const [classAssignments, subjectAssignments] = await Promise.all([
        supabase
          .from('teacher_class_assignments')
          .select('class_id')
          .eq('teacher_id', user?.id),
        supabase
          .from('subject_assignments')
          .select('subject_id')
          .eq('user_id', user?.id)
      ]);

      const teacherClassIds = classAssignments.data?.map(a => a.class_id) || [];
      const teacherSubjectIds = subjectAssignments.data?.map(a => a.subject_id) || [];

      // Fetch classes and subjects (filtered for teachers)
      let classesQuery = supabase.from('classes').select('*').order('name');
      let subjectsQuery = supabase.from('subjects').select('*').order('name');

      if (teacherClassIds.length > 0) {
        classesQuery = classesQuery.in('id', teacherClassIds);
      }
      if (teacherSubjectIds.length > 0) {
        subjectsQuery = subjectsQuery.in('id', teacherSubjectIds);
      }

      const [classesData, subjectsData] = await Promise.all([
        classesQuery,
        subjectsQuery
      ]);

      if (classesData.data) setClasses(classesData.data);
      if (subjectsData.data) setSubjects(subjectsData.data);

      // Fetch questions based on teacher's assignments
      let questionsQuery = supabase
        .from('questions')
        .select(`
          *,
          question_options(*),
          question_banks!inner(
            id,
            name,
            subject_id,
            class_id,
            subjects(name),
            classes(name)
          )
        `)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      // Filter by teacher's assignments
      if (teacherSubjectIds.length > 0) {
        questionsQuery = questionsQuery.in('question_banks.subject_id', teacherSubjectIds);
      }

      const { data: questionsData, error: questionsError } = await questionsQuery;

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        setQuestions([]);
      } else if (questionsData) {
        setQuestions(questionsData);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
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
          class_id: questionData.classId, // Add class_id directly
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

      // Refresh questions list
      await fetchData();

      toast({
        title: 'Question Created',
        description: 'Question has been added to the question bank successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create question',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Question Bank</h2>
          <p className="text-muted-foreground">
            Create and manage questions for your subjects and classes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 h-full">
        {/* Question Form */}
        <div className="h-full">
          <EnhancedQuestionForm
            onAddQuestion={handleAddQuestion}
            classes={classes}
            subjects={subjects}
          />
        </div>
        
        {/* Questions List */}
        <Card className="h-full">
          <StaticFormLayout
            header={
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Question Bank ({questions.length})</span>
                  <Badge variant="outline">
                    {questions.length} Questions
                  </Badge>
                </CardTitle>
              </CardHeader>
            }
          >
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Questions Yet</h3>
                  <p className="text-muted-foreground">
                    Create your first question using the form on the left.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question: any) => (
                    <Card key={question.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm sm:text-base line-clamp-2">
                                {question.question_text}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2">
                                <Badge variant="outline" className={
                                  question.difficulty_level === 'easy' ? 'text-green-600' :
                                  question.difficulty_level === 'medium' ? 'text-yellow-600' :
                                  'text-red-600'
                                }>
                                  {question.difficulty_level}
                                </Badge>
                                <Badge variant="secondary">
                                  {question.question_type === 'mcq' ? 'Multiple Choice' :
                                   question.question_type === 'true_false' ? 'True/False' :
                                   question.question_type === 'fill_blank' ? 'Fill Blank' :
                                   'Diagram'}
                                </Badge>
                                <Badge variant="outline">
                                  {question.points} point{question.points !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              {question.question_banks?.subjects?.name && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {question.question_banks.subjects.name} - {question.question_banks.classes?.name || 'All Classes'}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 shrink-0">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
                              </Button>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only sm:ml-1">Delete</span>
                              </Button>
                            </div>
                          </div>
                          
                          {question.question_options && question.question_options.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <div className="grid grid-cols-1 gap-1">
                                {question.question_options
                                  .sort((a: any, b: any) => a.option_order - b.option_order)
                                  .slice(0, 2)
                                  .map((option: any, index: number) => (
                                  <div key={option.id} className="flex items-center space-x-1">
                                    <span className={`w-4 h-4 rounded text-xs flex items-center justify-center ${
                                      option.is_correct 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {String.fromCharCode(65 + index)}
                                    </span>
                                    <span className={`line-clamp-1 text-xs sm:text-sm ${option.is_correct ? 'font-medium' : ''}`}>
                                      {option.option_text}
                                    </span>
                                    {option.is_correct && <CheckCircle className="h-3 w-3 text-green-600" />}
                                  </div>
                                ))}
                                {question.question_options.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{question.question_options.length - 2} more options
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </StaticFormLayout>
        </Card>
      </div>
    </div>
  );
};