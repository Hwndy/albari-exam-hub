import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Minus, Upload, Calculator, Image, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { StaticFormLayout } from '@/components/layout/StaticFormLayout';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface EnhancedQuestionFormData {
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'fill_blank' | 'diagram';
  options: QuestionOption[];
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  explanation: string;
  mediaUrl: string;
  formulaLatex: string;
  subjectId: string;
  classId: string;
  correctAnswers: string[];
}

interface EnhancedQuestionFormProps {
  onAddQuestion: (question: EnhancedQuestionFormData) => void;
  classes: Array<{id: string, name: string}>;
  subjects: Array<{id: string, name: string}>;
  existingQuestion?: any;
  onCancel?: () => void;
}

export const EnhancedQuestionForm: React.FC<EnhancedQuestionFormProps> = ({
  onAddQuestion,
  classes,
  subjects,
  existingQuestion,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<EnhancedQuestionFormData>({
    questionText: '',
    questionType: 'mcq',
    options: [
      { id: '1', text: '', isCorrect: false },
      { id: '2', text: '', isCorrect: false },
      { id: '3', text: '', isCorrect: false },
      { id: '4', text: '', isCorrect: false },
    ],
    difficulty: 'medium',
    points: 1,
    explanation: '',
    mediaUrl: '',
    formulaLatex: '',
    subjectId: '',
    classId: '',
    correctAnswers: []
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (existingQuestion) {
      setFormData({
        questionText: existingQuestion.question_text || '',
        questionType: existingQuestion.question_type || 'mcq',
        options: existingQuestion.question_options?.map((opt: any, index: number) => ({
          id: opt.id || (index + 1).toString(),
          text: opt.option_text || '',
          isCorrect: opt.is_correct || false
        })) || [
          { id: '1', text: '', isCorrect: false },
          { id: '2', text: '', isCorrect: false },
          { id: '3', text: '', isCorrect: false },
          { id: '4', text: '', isCorrect: false },
        ],
        difficulty: existingQuestion.difficulty_level || 'medium',
        points: existingQuestion.points || 1,
        explanation: existingQuestion.explanation || '',
        mediaUrl: existingQuestion.media_url || '',
        formulaLatex: existingQuestion.formula_latex || '',
        subjectId: existingQuestion.subject_id || '',
        classId: existingQuestion.class_id || '',
        correctAnswers: existingQuestion.correct_answers || []
      });

      if (existingQuestion.media_url) {
        setImagePreview(existingQuestion.media_url);
      }
    }
  }, [existingQuestion]);

  const handleQuestionTypeChange = (type: 'mcq' | 'true_false' | 'fill_blank' | 'diagram') => {
    let newOptions = formData.options;
    let newCorrectAnswers = formData.correctAnswers;

    if (type === 'true_false') {
      newOptions = [
        { id: '1', text: 'True', isCorrect: false },
        { id: '2', text: 'False', isCorrect: false }
      ];
      newCorrectAnswers = [];
    } else if (type === 'mcq') {
      newOptions = [
        { id: '1', text: '', isCorrect: false },
        { id: '2', text: '', isCorrect: false },
        { id: '3', text: '', isCorrect: false },
        { id: '4', text: '', isCorrect: false },
      ];
      newCorrectAnswers = [];
    } else if (type === 'fill_blank') {
      newOptions = [];
      newCorrectAnswers = [''];
    }

    setFormData({
      ...formData,
      questionType: type,
      options: newOptions,
      correctAnswers: newCorrectAnswers
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `question-media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('question-media')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('question-media')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const addOption = () => {
    const newId = (formData.options.length + 1).toString();
    setFormData({
      ...formData,
      options: [...formData.options, { id: newId, text: '', isCorrect: false }]
    });
  };

  const removeOption = (id: string) => {
    if (formData.options.length <= 2) return;
    setFormData({
      ...formData,
      options: formData.options.filter(opt => opt.id !== id)
    });
  };

  const updateOption = (id: string, text: string) => {
    setFormData({
      ...formData,
      options: formData.options.map(opt => 
        opt.id === id ? { ...opt, text } : opt
      )
    });
  };

  const setCorrectOption = (id: string) => {
    setFormData({
      ...formData,
      options: formData.options.map(opt => 
        ({ ...opt, isCorrect: opt.id === id })
      )
    });
  };

  const addCorrectAnswer = () => {
    setFormData({
      ...formData,
      correctAnswers: [...formData.correctAnswers, '']
    });
  };

  const removeCorrectAnswer = (index: number) => {
    setFormData({
      ...formData,
      correctAnswers: formData.correctAnswers.filter((_, i) => i !== index)
    });
  };

  const updateCorrectAnswer = (index: number, value: string) => {
    const newAnswers = [...formData.correctAnswers];
    newAnswers[index] = value;
    setFormData({ ...formData, correctAnswers: newAnswers });
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

    if (!formData.subjectId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a subject',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.classId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a class',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.questionType === 'mcq' || formData.questionType === 'true_false') {
      const hasCorrectAnswer = formData.options.some(opt => opt.isCorrect);
      if (!hasCorrectAnswer) {
        toast({
          title: 'Validation Error',
          description: 'Please select a correct answer',
          variant: 'destructive',
        });
        return false;
      }
    } else if (formData.questionType === 'fill_blank') {
      const hasValidAnswer = formData.correctAnswers.some(ans => ans.trim());
      if (!hasValidAnswer) {
        toast({
          title: 'Validation Error',
          description: 'Please provide at least one correct answer',
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

    try {
      let mediaUrl = formData.mediaUrl;
      
      // Upload image if selected
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          mediaUrl = uploadedUrl;
        }
      }

      const questionData = {
        ...formData,
        mediaUrl
      };

      onAddQuestion(questionData);
      
      if (!existingQuestion) {
        // Reset form for new question
        setFormData({
          questionText: '',
          questionType: 'mcq',
          options: [
            { id: '1', text: '', isCorrect: false },
            { id: '2', text: '', isCorrect: false },
            { id: '3', text: '', isCorrect: false },
            { id: '4', text: '', isCorrect: false },
          ],
          difficulty: 'medium',
          points: 1,
          explanation: '',
          mediaUrl: '',
          formulaLatex: '',
          subjectId: formData.subjectId, // Keep subject
          classId: formData.classId, // Keep class
          correctAnswers: []
        });
        setImageFile(null);
        setImagePreview(null);
      }
      
      toast({
        title: 'Success',
        description: `Question ${existingQuestion ? 'updated' : 'added'} successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save question',
        variant: 'destructive',
      });
    }
  };

  const formHeader = (
    <CardHeader>
      <CardTitle>
        {existingQuestion ? 'Edit Question' : 'Create New Question'}
      </CardTitle>
    </CardHeader>
  );

  const formFooter = (
    <div className="flex justify-between space-x-2">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
      <Button type="submit" className="flex-1">
        {existingQuestion ? 'Update Question' : 'Add Question'}
      </Button>
    </div>
  );

  return (
    <Card className="w-full h-full">
      <StaticFormLayout
        header={formHeader}
        footer={
          <CardContent className="pt-0">
            {formFooter}
          </CardContent>
        }
      >
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                >
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
                <Label htmlFor="class">Class *</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) => setFormData({ ...formData, classId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Question Type</Label>
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
                    <SelectItem value="diagram">Diagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                    setFormData({ ...formData, difficulty: value })
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
                  id="points"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <Label htmlFor="question">Question Text *</Label>
              <Textarea
                value={formData.questionText}
                onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                placeholder="Enter your question here..."
                rows={4}
              />
            </div>

            {/* Media Upload and LaTeX Formula */}
            <Tabs defaultValue="media" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="media">Media Upload</TabsTrigger>
                <TabsTrigger value="formula">LaTeX Formula</TabsTrigger>
              </TabsList>
              
              <TabsContent value="media" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image">Upload Image</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                    />
                    <Button type="button" variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Question preview"
                        className="max-w-xs max-h-48 rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
                          setFormData({ ...formData, mediaUrl: '' });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mediaUrl">Or Enter Media URL</Label>
                  <Input
                    id="mediaUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="formula" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="formula">LaTeX Formula</Label>
                  <Textarea
                    id="formula"
                    placeholder="Enter LaTeX formula (e.g., \frac{a}{b} = c)"
                    value={formData.formulaLatex}
                    onChange={(e) => setFormData({ ...formData, formulaLatex: e.target.value })}
                    rows={3}
                  />
                  {formData.formulaLatex && (
                    <div className="p-3 border rounded bg-gray-50">
                      <p className="text-sm text-gray-600 mb-2">Preview:</p>
                      <code className="text-sm">{formData.formulaLatex}</code>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Answer Options */}
            <div className="space-y-4">
              <Label>Answer Options</Label>
              
              {formData.questionType === 'mcq' && (
                <div className="space-y-3">
                  {formData.options.map((option, index) => (
                    <div key={option.id} className="flex items-center space-x-3">
                      <Checkbox
                        checked={option.isCorrect}
                        onCheckedChange={() => setCorrectOption(option.id)}
                      />
                      <Label className="min-w-0 flex-shrink-0">
                        {String.fromCharCode(65 + index)}.
                      </Label>
                      <Input
                        value={option.text}
                        onChange={(e) => updateOption(option.id, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        className="flex-1"
                      />
                      {formData.options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(option.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {formData.options.length < 6 && (
                    <Button type="button" variant="outline" onClick={addOption}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  )}
                </div>
              )}

              {formData.questionType === 'true_false' && (
                <div className="space-y-3">
                  {formData.options.map((option, index) => (
                    <div key={option.id} className="flex items-center space-x-3">
                      <Checkbox
                        checked={option.isCorrect}
                        onCheckedChange={() => setCorrectOption(option.id)}
                      />
                      <Label>{option.text}</Label>
                    </div>
                  ))}
                </div>
              )}

              {formData.questionType === 'fill_blank' && (
                <div className="space-y-3">
                  <Label>Correct Answers (students need to match any of these)</Label>
                  {formData.correctAnswers.map((answer, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Input
                        value={answer}
                        onChange={(e) => updateCorrectAnswer(index, e.target.value)}
                        placeholder={`Correct answer ${index + 1}`}
                        className="flex-1"
                      />
                      {formData.correctAnswers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCorrectAnswer(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button type="button" variant="outline" onClick={addCorrectAnswer}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Answer
                  </Button>
                </div>
              )}
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation (Optional)</Label>
              <Textarea
                id="explanation"
                placeholder="Explain why this is the correct answer..."
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                rows={3}
              />
            </div>
          </form>
        </CardContent>
      </StaticFormLayout>
    </Card>
  );
};