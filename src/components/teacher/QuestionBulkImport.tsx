import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface QuestionBulkImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const QuestionBulkImport: React.FC<QuestionBulkImportProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [questionBankId, setQuestionBankId] = useState('');
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

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
    const csvContent = `question_text,question_type,difficulty_level,points,option_a,option_b,option_c,option_d,correct_option,explanation
"What is 2+2?",mcq,easy,1,"3","4","5","6",B,"Basic arithmetic"
"The sun rises in the east",true_false,easy,1,"True","False",,,"A","Basic geography"
"Fill in the blank: The capital of France is ___",fill_blank,medium,2,"Paris","London","Berlin","Madrid",A,"Paris is the capital of France"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const question: any = {};

      headers.forEach((header, index) => {
        question[header] = values[index] || '';
      });

      if (question.question_text) {
        questions.push(question);
      }
    }

    return questions;
  };

  const validateQuestion = (question: any): string[] => {
    const errors: string[] = [];

    if (!question.question_text) errors.push('Question text is required');
    if (!['mcq', 'true_false', 'fill_blank'].includes(question.question_type)) {
      errors.push('Invalid question type. Must be: mcq, true_false, or fill_blank');
    }
    if (!['easy', 'medium', 'hard'].includes(question.difficulty_level)) {
      errors.push('Invalid difficulty level. Must be: easy, medium, or hard');
    }
    if (isNaN(parseInt(question.points)) || parseInt(question.points) < 1) {
      errors.push('Points must be a positive number');
    }

    if (question.question_type === 'mcq') {
      if (!question.option_a || !question.option_b) {
        errors.push('MCQ questions must have at least options A and B');
      }
      if (!['A', 'B', 'C', 'D'].includes(question.correct_option?.toUpperCase())) {
        errors.push('Correct option must be A, B, C, or D for MCQ questions');
      }
    }

    if (question.question_type === 'true_false') {
      if (!['A', 'B'].includes(question.correct_option?.toUpperCase())) {
        errors.push('Correct option must be A or B for True/False questions');
      }
    }

    return errors;
  };

  const handleImport = async () => {
    if (!selectedFile || !questionBankId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a file and question bank',
        variant: 'destructive',
      });
      return;
    }

    try {
      setImporting(true);
      setProgress(0);
      setResults(null);

      const fileText = await selectedFile.text();
      const questions = parseCSV(fileText);
      
      const importResults = {
        success: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const validationErrors = validateQuestion(question);

        if (validationErrors.length > 0) {
          importResults.errors.push(`Row ${i + 2}: ${validationErrors.join(', ')}`);
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
              points: parseInt(question.points),
              explanation: question.explanation || null,
              question_bank_id: questionBankId,
              created_by: user?.id || '',
            })
            .select()
            .single();

          if (questionError) throw questionError;

          // Insert options for MCQ and True/False
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
              is_correct: opt.order === (question.correct_option?.toUpperCase().charCodeAt(0) - 64),
            }));

            const { error: optionsError } = await supabase
              .from('question_options')
              .insert(optionsData);

            if (optionsError) throw optionsError;
          }

          importResults.success++;
        } catch (error: any) {
          importResults.errors.push(`Row ${i + 2}: ${error.message}`);
        }

        setProgress(((i + 1) / questions.length) * 100);
      }

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
    setQuestionBankId('');
    setProgress(0);
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Step 1: Download Template</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Download the CSV template to ensure your data is formatted correctly.
              </p>
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Step 2: Upload CSV File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="questionBank">Question Bank</Label>
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

              <div className="space-y-2">
                <Label htmlFor="csvFile">CSV File</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="csvFile"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="csvFile" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : 'Click to upload CSV file'}
                    </p>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

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
          <div className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!selectedFile || !questionBankId || importing}
            >
              {importing ? 'Importing...' : 'Import Questions'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};