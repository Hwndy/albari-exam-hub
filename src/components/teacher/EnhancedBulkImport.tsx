import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Clipboard,
  Type
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';

interface EnhancedBulkImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedQuestion {
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'fill_blank';
  difficulty_level: 'easy' | 'medium' | 'hard';
  points: number;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  correct_answers?: string;
  explanation?: string;
}

export const EnhancedBulkImport: React.FC<EnhancedBulkImportProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [questionBankId, setQuestionBankId] = useState('');
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState('paste');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { schoolId } = useSchoolQuery();

  React.useEffect(() => {
    if (isOpen) {
      fetchQuestionBanks();
    }
  }, [isOpen]);

  const fetchQuestionBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('question_banks')
        .select('*')
        .order('name');

      if (error) throw error;
      setQuestionBanks(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch question banks',
        variant: 'destructive',
      });
    }
  };

  const downloadTemplate = () => {
    const csvContent = `question_text,question_type,difficulty_level,points,option_a,option_b,option_c,option_d,correct_option,correct_answers,explanation
"What is 2+2?",mcq,easy,1,"3","4","5","6",B,,"Basic arithmetic"
"The sun rises in the east",true_false,easy,1,"True","False",,,,A,"Basic geography fact"
"Fill in the blank: The capital of France is ___",fill_blank,medium,2,,,,,,"Paris|paris","Multiple acceptable answers separated by |"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enhanced_question_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const copyTemplateText = () => {
    const templateText = `Question: What is 2+2?
Type: mcq
Difficulty: easy
Points: 1
Options:
A) 3
B) 4
C) 5
D) 6
Correct: B
Explanation: Basic arithmetic

---

Question: The sun rises in the east
Type: true_false
Difficulty: easy
Points: 1
Options:
A) True
B) False
Correct: A
Explanation: Basic geography fact

---

Question: Fill in the blank: The capital of France is ___
Type: fill_blank
Difficulty: medium
Points: 2
Correct Answers: Paris, paris
Explanation: Multiple acceptable answers can be provided`;

    navigator.clipboard.writeText(templateText).then(() => {
      toast({
        title: 'Copied!',
        description: 'Template format copied to clipboard',
      });
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a CSV file',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setResults(null);
    }
  };

  const parseCSV = (csvText: string): ParsedQuestion[] => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const questions: ParsedQuestion[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const question: any = {};

      headers.forEach((header, index) => {
        question[header] = values[index] || '';
      });

      if (question.question_text) {
        questions.push(question as ParsedQuestion);
      }
    }

    return questions;
  };

  const parseTextFormat = (text: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = [];
    const questionBlocks = text.split('---').map(block => block.trim()).filter(block => block);

    for (const block of questionBlocks) {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line);
      const question: Partial<ParsedQuestion> = {};
      let optionIndex = 0;

      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.startsWith('question:')) {
          question.question_text = line.substring(9).trim();
        } else if (lowerLine.startsWith('type:')) {
          const type = line.substring(5).trim().toLowerCase();
          if (['mcq', 'true_false', 'fill_blank'].includes(type)) {
            question.question_type = type as 'mcq' | 'true_false' | 'fill_blank';
          }
        } else if (lowerLine.startsWith('difficulty:')) {
          const difficulty = line.substring(11).trim().toLowerCase();
          if (['easy', 'medium', 'hard'].includes(difficulty)) {
            question.difficulty_level = difficulty as 'easy' | 'medium' | 'hard';
          }
        } else if (lowerLine.startsWith('points:')) {
          question.points = parseInt(line.substring(7).trim()) || 1;
        } else if (lowerLine.startsWith('options:')) {
          // Options parsing will continue in following lines
          continue;
        } else if (line.match(/^[A-D]\)/)) {
          // Parse option lines
          const optionText = line.substring(2).trim();
          const optionKeys = ['option_a', 'option_b', 'option_c', 'option_d'];
          if (optionIndex < optionKeys.length) {
            (question as any)[optionKeys[optionIndex]] = optionText;
            optionIndex++;
          }
        } else if (lowerLine.startsWith('correct:')) {
          const correct = line.substring(8).trim().toUpperCase();
          if (question.question_type === 'fill_blank') {
            question.correct_answers = correct;
          } else {
            question.correct_option = correct;
          }
        } else if (lowerLine.startsWith('correct answers:')) {
          question.correct_answers = line.substring(16).trim();
        } else if (lowerLine.startsWith('explanation:')) {
          question.explanation = line.substring(12).trim();
        }
      }

      if (question.question_text && question.question_type) {
        questions.push(question as ParsedQuestion);
      }
    }

    return questions;
  };

  const validateQuestion = (question: ParsedQuestion): string[] => {
    const errors: string[] = [];

    if (!question.question_text) errors.push('Question text is required');
    if (!['mcq', 'true_false', 'fill_blank'].includes(question.question_type)) {
      errors.push('Invalid question type. Must be: mcq, true_false, or fill_blank');
    }
    if (!['easy', 'medium', 'hard'].includes(question.difficulty_level)) {
      errors.push('Invalid difficulty level. Must be: easy, medium, or hard');
    }
    if (isNaN(question.points) || question.points < 1) {
      errors.push('Points must be a positive number');
    }

    if (question.question_type === 'mcq') {
      if (!question.option_a || !question.option_b) {
        errors.push('MCQ questions must have at least options A and B');
      }
      if (!['A', 'B', 'C', 'D'].includes(question.correct_option?.toUpperCase() || '')) {
        errors.push('Correct option must be A, B, C, or D for MCQ questions');
      }
    }

    if (question.question_type === 'true_false') {
      if (!['A', 'B'].includes(question.correct_option?.toUpperCase() || '')) {
        errors.push('Correct option must be A or B for True/False questions');
      }
    }

    if (question.question_type === 'fill_blank') {
      if (!question.correct_answers) {
        errors.push('Fill-in-the-blank questions must have correct answers specified');
      }
    }

    return errors;
  };

  const processQuestions = async (questions: ParsedQuestion[]) => {
    const importResults = {
      success: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const validationErrors = validateQuestion(question);

      if (validationErrors.length > 0) {
        importResults.errors.push(`Question ${i + 1}: ${validationErrors.join(', ')}`);
        setProgress(((i + 1) / questions.length) * 100);
        continue;
      }

      try {
        // Insert question
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert({
            question_text: question.question_text,
            question_type: question.question_type,
            difficulty_level: question.difficulty_level,
            points: question.points,
            explanation: question.explanation || null,
            question_bank_id: questionBankId,
            created_by: user?.id || '',
            school_id: schoolId,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Insert options/answers
        if (question.question_type === 'mcq' || question.question_type === 'true_false') {
          const options = [];
          
          if (question.question_type === 'mcq') {
            if (question.option_a) options.push({ text: question.option_a, order: 1 });
            if (question.option_b) options.push({ text: question.option_b, order: 2 });
            if (question.option_c) options.push({ text: question.option_c, order: 3 });
            if (question.option_d) options.push({ text: question.option_d, order: 4 });
          } else {
            options.push({ text: 'True', order: 1 });
            options.push({ text: 'False', order: 2 });
          }

          const optionsData = options.map(opt => ({
            question_id: questionData.id,
            option_text: opt.text,
            option_order: opt.order,
            is_correct: opt.order === (question.correct_option?.toUpperCase().charCodeAt(0) || 65) - 64,
            school_id: schoolId,
          }));

          const { error: optionsError } = await supabase
            .from('question_options')
            .insert(optionsData);

          if (optionsError) throw optionsError;
        }

        if (question.question_type === 'fill_blank' && question.correct_answers) {
          // Handle multiple correct answers separated by |, comma, or semicolon
          const answers = question.correct_answers
            .split(/[|,;]/)
            .map(ans => ans.trim())
            .filter(ans => ans);

          const answersData = answers.map((ans, index) => ({
            question_id: questionData.id,
            option_text: ans,
            option_order: index + 1,
            is_correct: true,
            school_id: schoolId,
          }));

          const { error: answersError } = await supabase
            .from('question_options')
            .insert(answersData);

          if (answersError) throw answersError;
        }

        importResults.success++;
      } catch (error: any) {
        importResults.errors.push(`Question ${i + 1}: ${error.message}`);
      }

      setProgress(((i + 1) / questions.length) * 100);
    }

    return importResults;
  };

  const handleImport = async () => {
    if (!questionBankId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a question bank',
        variant: 'destructive',
      });
      return;
    }

    let questions: ParsedQuestion[] = [];

    if (activeTab === 'upload' && selectedFile) {
      try {
        const fileText = await selectedFile.text();
        questions = parseCSV(fileText);
      } catch (error) {
        toast({
          title: 'File Read Error',
          description: 'Could not read the selected file',
          variant: 'destructive',
        });
        return;
      }
    } else if (activeTab === 'paste' && pastedText.trim()) {
      questions = parseTextFormat(pastedText);
    } else {
      toast({
        title: 'No Data',
        description: 'Please upload a file or paste question text',
        variant: 'destructive',
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: 'No Valid Questions',
        description: 'No valid questions found in the provided data',
        variant: 'destructive',
      });
      return;
    }

    try {
      setImporting(true);
      setProgress(0);
      setResults(null);

      const importResults = await processQuestions(questions);
      setResults(importResults);
      
      if (importResults.success > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${importResults.success} questions`,
        });
        onImportComplete();
      }
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPastedText('');
    setQuestionBankId('');
    setProgress(0);
    setResults(null);
    setActiveTab('paste');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enhanced Bulk Import Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question Bank Selection */}
          <div className="space-y-2">
            <Label htmlFor="questionBank">Question Bank *</Label>
            <Select value={questionBankId} onValueChange={setQuestionBankId}>
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

          {/* Import Methods */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste" className="flex items-center">
                <Clipboard className="h-4 w-4 mr-2" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Paste Questions</CardTitle>
                    <Button variant="outline" size="sm" onClick={copyTemplateText}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Type className="h-4 w-4" />
                    <AlertDescription>
                      Format: Start each question with "Question:", specify type, difficulty, points, options, and correct answer. Separate multiple questions with "---".
                    </AlertDescription>
                  </Alert>
                  
                  <Textarea
                    placeholder="Paste your questions here using the template format..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="min-h-80 font-mono text-sm"
                  />
                  
                  {pastedText && (
                    <div className="text-sm text-muted-foreground">
                      {parseTextFormat(pastedText).length} question(s) detected
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Upload CSV File</CardTitle>
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="csvFile">CSV File</Label>
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full cursor-pointer"
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {selectedFile ? selectedFile.name : 'Click to upload CSV file'}
                        </p>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Import Progress */}
          {importing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importing questions...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  {results.success > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-success mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Successfully imported:</span>
                  <span className="font-medium text-success">{results.success} questions</span>
                </div>
                
                {results.errors.length > 0 && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Errors:</span>
                      <span className="font-medium text-destructive">{results.errors.length}</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.errors.map((error, index) => (
                        <Alert key={index} variant="destructive" className="py-2">
                          <AlertDescription className="text-xs">{error}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex space-x-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={
                (!selectedFile && !pastedText.trim()) || 
                !questionBankId || 
                importing
              }
            >
              {importing ? 'Importing...' : 'Import Questions'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};