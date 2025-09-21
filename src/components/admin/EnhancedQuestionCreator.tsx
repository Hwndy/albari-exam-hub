import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Upload, ImageIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionFormData {
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'fill_blank' | 'diagram';
  difficultyLevel: 'easy' | 'medium' | 'hard';
  points: number;
  explanation: string;
  options: QuestionOption[];
  correctAnswers: string[];
  hasMedia: boolean;
  mediaUrl: string;
  formulaLatex: string;
  questionBankId: string;
}

interface Subject {
  id: string;
  name: string;
}

interface QuestionBank {
  id: string;
  name: string;
  subject_id: string;
}

export const EnhancedQuestionCreator: React.FC = () => {
  const [formData, setFormData] = useState<QuestionFormData>({
    questionText: '',
    questionType: 'mcq',
    difficultyLevel: 'medium',
    points: 1,
    explanation: '',
    options: [
      { id: '1', text: '', isCorrect: false },
      { id: '2', text: '', isCorrect: false },
      { id: '3', text: '', isCorrect: false },
      { id: '4', text: '', isCorrect: false },
    ],
    correctAnswers: [],
    hasMedia: false,
    mediaUrl: '',
    formulaLatex: '',
    questionBankId: '',
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchQuestionBanks(selectedSubject);
    }
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects',
        variant: 'destructive',
      });
    }
  };

  const fetchQuestionBanks = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('question_banks')
        .select('id, name, subject_id')
        .eq('subject_id', subjectId)
        .order('name');

      if (error) throw error;
      setQuestionBanks(data || []);
    } catch (error) {
      console.error('Error fetching question banks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load question banks',
        variant: 'destructive',
      });
    }
  };

  const handleQuestionTypeChange = (type: QuestionFormData['questionType']) => {
    setFormData(prev => {
      const newData = { ...prev, questionType: type };
      
      if (type === 'true_false') {
        newData.options = [
          { id: '1', text: 'True', isCorrect: false },
          { id: '2', text: 'False', isCorrect: false },
        ];
      } else if (type === 'fill_blank') {
        newData.options = [];
        newData.correctAnswers = [''];
      } else if (type === 'mcq') {
        newData.options = [
          { id: '1', text: '', isCorrect: false },
          { id: '2', text: '', isCorrect: false },
          { id: '3', text: '', isCorrect: false },
          { id: '4', text: '', isCorrect: false },
        ];
        newData.correctAnswers = [];
      } else if (type === 'diagram') {
        newData.options = [];
        newData.hasMedia = true;
      }
      
      return newData;
    });
  };

  const handleOptionChange = (optionId: string, text: string, isCorrect?: boolean) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map(option =>
        option.id === optionId
          ? { ...option, text, ...(isCorrect !== undefined && { isCorrect }) }
          : option
      ),
    }));
  };

  const addOption = () => {
    const newId = (formData.options.length + 1).toString();
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { id: newId, text: '', isCorrect: false }],
    }));
  };

  const removeOption = (optionId: string) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter(option => option.id !== optionId),
      }));
    }
  };

  const handleCorrectAnswerChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      correctAnswers: prev.correctAnswers.map((answer, i) =>
        i === index ? value : answer
      ),
    }));
  };

  const addCorrectAnswer = () => {
    setFormData(prev => ({
      ...prev,
      correctAnswers: [...prev.correctAnswers, ''],
    }));
  };

  const removeCorrectAnswer = (index: number) => {
    if (formData.correctAnswers.length > 1) {
      setFormData(prev => ({
        ...prev,
        correctAnswers: prev.correctAnswers.filter((_, i) => i !== index),
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.questionText.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Question text is required',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.questionBankId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a question bank',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.questionType === 'mcq' || formData.questionType === 'true_false') {
      const hasCorrectOption = formData.options.some(option => option.isCorrect);
      if (!hasCorrectOption) {
        toast({
          title: 'Validation Error',
          description: 'At least one option must be marked as correct',
          variant: 'destructive',
        });
        return false;
      }
    }

    if (formData.questionType === 'fill_blank') {
      const hasValidAnswer = formData.correctAnswers.some(answer => answer.trim() !== '');
      if (!hasValidAnswer) {
        toast({
          title: 'Validation Error',
          description: 'At least one correct answer is required',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Create the question
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert({
          question_text: formData.questionText,
          question_type: formData.questionType,
          difficulty_level: formData.difficultyLevel,
          points: formData.points,
          explanation: formData.explanation,
          has_media: formData.hasMedia,
          media_url: formData.mediaUrl || null,
          formula_latex: formData.formulaLatex || null,
          question_bank_id: formData.questionBankId,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Create options for MCQ and True/False questions
      if (formData.questionType === 'mcq' || formData.questionType === 'true_false') {
        const optionsData = formData.options
          .filter(option => option.text.trim() !== '')
          .map((option, index) => ({
            question_id: questionData.id,
            option_text: option.text,
            is_correct: option.isCorrect,
            option_order: index + 1,
          }));

        if (optionsData.length > 0) {
          const { error: optionsError } = await supabase
            .from('question_options')
            .insert(optionsData);

          if (optionsError) throw optionsError;
        }
      }

      // Create options for fill-in-the-blank questions
      if (formData.questionType === 'fill_blank') {
        const correctAnswersData = formData.correctAnswers
          .filter(answer => answer.trim() !== '')
          .map((answer, index) => ({
            question_id: questionData.id,
            option_text: answer.trim(),
            is_correct: true,
            option_order: index + 1,
          }));

        if (correctAnswersData.length > 0) {
          const { error: answersError } = await supabase
            .from('question_options')
            .insert(correctAnswersData);

          if (answersError) throw answersError;
        }
      }

      toast({
        title: 'Success',
        description: 'Question created successfully!',
      });

      // Reset form
      setFormData({
        questionText: '',
        questionType: 'mcq',
        difficultyLevel: 'medium',
        points: 1,
        explanation: '',
        options: [
          { id: '1', text: '', isCorrect: false },
          { id: '2', text: '', isCorrect: false },
          { id: '3', text: '', isCorrect: false },
          { id: '4', text: '', isCorrect: false },
        ],
        correctAnswers: [],
        hasMedia: false,
        mediaUrl: '',
        formulaLatex: '',
        questionBankId: '',
      });

    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: 'Error',
        description: 'Failed to create question',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Question</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject and Question Bank Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionBank">Question Bank</Label>
              <Select
                value={formData.questionBankId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, questionBankId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select question bank" />
                </SelectTrigger>
                <SelectContent>
                  {questionBanks.map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="questionText">Question Text</Label>
            <RichTextEditor
              value={formData.questionText}
              onChange={(value) => setFormData(prev => ({ ...prev, questionText: value }))}
              placeholder="Enter your question here..."
              className="min-h-[200px]"
            />
          </div>

          {/* Question Type and Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="questionType">Question Type</Label>
              <Select
                value={formData.questionType}
                onValueChange={handleQuestionTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                  <SelectItem value="diagram">Diagram Question</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={formData.difficultyLevel}
                onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                  setFormData(prev => ({ ...prev, difficultyLevel: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasMedia"
                checked={formData.hasMedia}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, hasMedia: !!checked }))
                }
              />
              <Label htmlFor="hasMedia">Include image/diagram</Label>
            </div>

            {formData.hasMedia && (
              <div className="space-y-2">
                <Label htmlFor="mediaUrl">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter image URL or upload file"
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                  />
                  <Button type="button" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Options based on question type */}
          {(formData.questionType === 'mcq' || formData.questionType === 'true_false') && (
            <div className="space-y-4">
              <Label>Answer Options</Label>
              {formData.options.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={option.isCorrect}
                    onCheckedChange={(checked) =>
                      handleOptionChange(option.id, option.text, !!checked)
                    }
                  />
                  {formData.questionType === 'true_false' ? (
                    <div className="flex-1 p-2 border rounded">
                      {option.text}
                    </div>
                  ) : (
                    <Input
                      className="flex-1"
                      placeholder={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    />
                  )}
                  {formData.questionType === 'mcq' && formData.options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(option.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {formData.questionType === 'mcq' && (
                <Button type="button" variant="outline" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              )}
            </div>
          )}

          {/* Fill in the blank answers */}
          {formData.questionType === 'fill_blank' && (
            <div className="space-y-4">
              <Label>Correct Answers (case-sensitive)</Label>
              {formData.correctAnswers.map((answer, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    className="flex-1"
                    placeholder={`Correct answer ${index + 1}`}
                    value={answer}
                    onChange={(e) => handleCorrectAnswerChange(index, e.target.value)}
                  />
                  {formData.correctAnswers.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCorrectAnswer(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addCorrectAnswer}>
                <Plus className="h-4 w-4 mr-2" />
                Add Alternative Answer
              </Button>
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <RichTextEditor
              value={formData.explanation}
              onChange={(value) => setFormData(prev => ({ ...prev, explanation: value }))}
              placeholder="Explain the correct answer..."
              className="min-h-[100px]"
            />
          </div>

          {/* Formula (LaTeX) */}
          <div className="space-y-2">
            <Label htmlFor="formula">Mathematical Formula (LaTeX - Optional)</Label>
            <Textarea
              placeholder="Enter LaTeX formula (e.g., E = mc^2)"
              value={formData.formulaLatex}
              onChange={(e) => setFormData(prev => ({ ...prev, formulaLatex: e.target.value }))}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Question'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};