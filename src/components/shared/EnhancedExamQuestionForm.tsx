import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { StaticFormLayout } from '@/components/layout/StaticFormLayout';
import { Plus, Minus, Upload, Image, Eye, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface EnhancedQuestionFormData {
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'fill_blank' | 'diagram';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  options: QuestionOption[];
  explanation: string;
  mediaUrl: string;
  formulaLatex: string;
  classId: string;
  subjectId: string;
  correctAnswers: string[];
}

interface EnhancedExamQuestionFormProps {
  onAddQuestion: (question: any) => void;
  classes: any[];
  subjects: any[];
  existingQuestion?: any;
}

export const EnhancedExamQuestionForm: React.FC<EnhancedExamQuestionFormProps> = ({
  onAddQuestion,
  classes,
  subjects,
  existingQuestion
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<EnhancedQuestionFormData>({
    questionText: existingQuestion?.questionText || '',
    questionType: existingQuestion?.questionType || 'mcq',
    difficulty: existingQuestion?.difficulty || 'medium',
    points: existingQuestion?.points || 1,
    options: existingQuestion?.options || [
      { id: `opt-${Date.now()}-1`, text: '', isCorrect: false },
      { id: `opt-${Date.now()}-2`, text: '', isCorrect: false },
      { id: `opt-${Date.now()}-3`, text: '', isCorrect: false },
      { id: `opt-${Date.now()}-4`, text: '', isCorrect: false },
    ],
    explanation: existingQuestion?.explanation || '',
    mediaUrl: existingQuestion?.mediaUrl || '',
    formulaLatex: existingQuestion?.formulaLatex || '',
    classId: existingQuestion?.classId || '',
    subjectId: existingQuestion?.subjectId || '',
    correctAnswers: existingQuestion?.correctAnswers || [],
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleQuestionTypeChange = (type: 'mcq' | 'true_false' | 'fill_blank' | 'diagram') => {
    let newOptions = [...formData.options];
    
    if (type === 'true_false') {
      newOptions = [
        { id: `opt-${Date.now()}-1`, text: 'True', isCorrect: false },
        { id: `opt-${Date.now()}-2`, text: 'False', isCorrect: false },
      ];
    } else if (type === 'mcq' && formData.options.length < 3) {
      newOptions = [
        { id: `opt-${Date.now()}-1`, text: '', isCorrect: false },
        { id: `opt-${Date.now()}-2`, text: '', isCorrect: false },
        { id: `opt-${Date.now()}-3`, text: '', isCorrect: false },
        { id: `opt-${Date.now()}-4`, text: '', isCorrect: false },
      ];
    }
    
    setFormData({ ...formData, questionType: type, options: newOptions, correctAnswers: [] });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setFormData({ ...formData, mediaUrl: url });
    }
  };

  const addOption = useCallback(() => {
    const newOption: QuestionOption = {
      id: `opt-${Date.now()}-${formData.options.length + 1}`,
      text: '',
      isCorrect: false,
    };
    setFormData({ ...formData, options: [...formData.options, newOption] });
  }, [formData.options, formData]);

  const removeOption = useCallback((optionId: string) => {
    setFormData({
      ...formData,
      options: formData.options.filter(opt => opt.id !== optionId),
    });
  }, [formData]);

  const updateOption = useCallback((optionId: string, field: keyof QuestionOption, value: any) => {
    const newOptions = formData.options.map(opt =>
      opt.id === optionId ? { ...opt, [field]: value } : opt
    );
    setFormData({ ...formData, options: newOptions });
  }, [formData]);

  const addCorrectAnswer = () => {
    setFormData({
      ...formData,
      correctAnswers: [...formData.correctAnswers, ''],
    });
  };

  const updateCorrectAnswer = (index: number, value: string) => {
    const newAnswers = [...formData.correctAnswers];
    newAnswers[index] = value;
    setFormData({ ...formData, correctAnswers: newAnswers });
  };

  const removeCorrectAnswer = (index: number) => {
    setFormData({
      ...formData,
      correctAnswers: formData.correctAnswers.filter((_, i) => i !== index),
    });
  };

  const validateForm = (): boolean => {
    if (!formData.questionText.trim()) {
      toast({ title: 'Error', description: 'Question text is required', variant: 'destructive' });
      return false;
    }

    if (!formData.subjectId) {
      toast({ title: 'Error', description: 'Subject is required', variant: 'destructive' });
      return false;
    }

    if (!formData.classId) {
      toast({ title: 'Error', description: 'Class is required', variant: 'destructive' });
      return false;
    }

    if (formData.questionType === 'mcq' || formData.questionType === 'true_false') {
      const hasCorrectAnswer = formData.options.some(opt => opt.isCorrect);
      if (!hasCorrectAnswer) {
        toast({ title: 'Error', description: 'At least one correct answer is required', variant: 'destructive' });
        return false;
      }
    }

    if (formData.questionType === 'fill_blank' && formData.correctAnswers.length === 0) {
      toast({ title: 'Error', description: 'At least one correct answer is required', variant: 'destructive' });
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const questionData = {
      id: existingQuestion?.id || `q-${Date.now()}-${Math.random()}`,
      questionText: formData.questionText,
      questionType: formData.questionType,
      difficulty: formData.difficulty,
      points: formData.points,
      options: formData.options,
      explanation: formData.explanation,
      mediaUrl: formData.mediaUrl,
      formulaLatex: formData.formulaLatex,
      classId: formData.classId,
      subjectId: formData.subjectId,
      correctAnswers: formData.correctAnswers,
      imageFile,
    };

    onAddQuestion(questionData);
    
    // Reset form if not editing
    if (!existingQuestion) {
      setFormData({
        questionText: '',
        questionType: 'mcq',
        difficulty: 'medium',
        points: 1,
        options: [
          { id: `opt-${Date.now()}-1`, text: '', isCorrect: false },
          { id: `opt-${Date.now()}-2`, text: '', isCorrect: false },
          { id: `opt-${Date.now()}-3`, text: '', isCorrect: false },
          { id: `opt-${Date.now()}-4`, text: '', isCorrect: false },
        ],
        explanation: '',
        mediaUrl: '',
        formulaLatex: '',
        classId: '',
        subjectId: '',
        correctAnswers: [],
      });
      setImageFile(null);
      setPreviewUrl('');
    }
  };

  const formHeader = (
    <CardHeader>
      <CardTitle>{existingQuestion ? 'Edit Question' : 'Add New Question'}</CardTitle>
    </CardHeader>
  );

  const formFooter = (
    <div className="p-6 border-t">
      <Button onClick={handleSubmit} className="w-full">
        {existingQuestion ? 'Update Question' : 'Add Question'}
      </Button>
    </div>
  );

  return (
    <Card className="w-full h-full">
      <StaticFormLayout header={formHeader} footer={formFooter}>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Subject</Label>
              <Select value={formData.subjectId} onValueChange={(value) => setFormData({ ...formData, subjectId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Class</Label>
              <Select value={formData.classId} onValueChange={(value) => setFormData({ ...formData, classId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Question Type</Label>
              <Select
                value={formData.questionType}
                onValueChange={(value: 'mcq' | 'true_false' | 'fill_blank' | 'diagram') => handleQuestionTypeChange(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                  <SelectItem value="diagram">Diagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Difficulty</Label>
              <Select value={formData.difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setFormData({ ...formData, difficulty: value })}>
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

            <div>
              <Label>Points</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <Label>Question Text</Label>
            <RichTextEditor
              value={formData.questionText}
              onChange={(value) => setFormData({ ...formData, questionText: value })}
              placeholder="Enter your question here..."
            />
          </div>

          {/* Media and Formula Section */}
          <Tabs defaultValue="media" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="media">Media Upload</TabsTrigger>
              <TabsTrigger value="formula">Formula (LaTeX)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="media" className="space-y-4">
              <div>
                <Label>Upload Image</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button variant="outline" asChild className="cursor-pointer">
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Image
                      </span>
                    </Button>
                  </label>
                </div>
                {previewUrl && (
                  <div className="mt-4">
                    <img src={previewUrl} alt="Preview" className="max-w-xs rounded-lg border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewUrl('');
                        setImageFile(null);
                        setFormData({ ...formData, mediaUrl: '' });
                      }}
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="formula" className="space-y-4">
              <div>
                <Label>LaTeX Formula</Label>
                <Textarea
                  value={formData.formulaLatex}
                  onChange={(e) => setFormData({ ...formData, formulaLatex: e.target.value })}
                  placeholder="Enter LaTeX formula (e.g., x^2 + y^2 = r^2)"
                  className="font-mono"
                />
                {formData.formulaLatex && (
                  <div className="mt-2 p-2 bg-muted rounded text-center">
                    Formula preview: <code>{formData.formulaLatex}</code>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Answer Options */}
          {formData.questionType === 'mcq' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Answer Options</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>
              {formData.options.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <span className="text-sm font-medium w-8">{String.fromCharCode(65 + index)}.</span>
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className="flex-1"
                  />
                  <Checkbox
                    checked={option.isCorrect}
                    onCheckedChange={(checked) => updateOption(option.id, 'isCorrect', checked)}
                  />
                  <Label className="text-sm">Correct</Label>
                  {formData.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(option.id)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {formData.questionType === 'true_false' && (
            <div className="space-y-4">
              <Label>Answer Options</Label>
              {formData.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-4">
                  <span className="text-sm font-medium w-16">{option.text}</span>
                  <Checkbox
                    checked={option.isCorrect}
                    onCheckedChange={(checked) => updateOption(option.id, 'isCorrect', checked)}
                  />
                  <Label className="text-sm">Correct Answer</Label>
                </div>
              ))}
            </div>
          )}

          {formData.questionType === 'fill_blank' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Correct Answers</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCorrectAnswer}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Answer
                </Button>
              </div>
              {formData.correctAnswers.map((answer, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={answer}
                    onChange={(e) => updateCorrectAnswer(index, e.target.value)}
                    placeholder={`Correct answer ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCorrectAnswer(index)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Explanation */}
          <div>
            <Label>Explanation (Optional)</Label>
            <RichTextEditor
              value={formData.explanation}
              onChange={(value) => setFormData({ ...formData, explanation: value })}
              placeholder="Provide an explanation for the answer..."
            />
          </div>
        </CardContent>
      </StaticFormLayout>
    </Card>
  );
};