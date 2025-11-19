import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';

interface BulkQuestionImportProps {
  subjects: any[];
  classes: any[];
  onComplete: () => void;
  onCancel: () => void;
}

export const BulkQuestionImport: React.FC<BulkQuestionImportProps> = ({
  subjects,
  classes,
  onComplete,
  onCancel
}) => {
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  });
  const { toast } = useToast();
  const { withSchoolFilter, withSchoolData } = useSchoolQuery();

  const handleBulkImport = async () => {
    if (!subjectId || !classId || !questionsText.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select subject, class and provide questions.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setResults({ success: 0, failed: 0, errors: [] });

    try {
      const questionsArray = parseQuestionsText(questionsText);
      
      if (questionsArray.length > 1000) {
        toast({
          title: 'Too Many Questions',
          description: 'Maximum 1000 questions allowed per import.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Get or create question bank - include both subject and class
      const bankQuery = supabase
        .from('question_banks')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('class_id', classId)
        .single();
      
      let { data: questionBank } = await withSchoolFilter(bankQuery);

      if (!questionBank) {
        const selectedSubject = subjects.find(s => s.id === subjectId);
        const selectedClass = classes.find(c => c.id === classId);
        
        const bankData = withSchoolData({
          name: `${selectedSubject?.name} - ${selectedClass?.name} Question Bank`,
          description: `Question bank for ${selectedSubject?.name} in ${selectedClass?.name}`,
          subject_id: subjectId,
          class_id: classId,
          created_by: (await supabase.auth.getUser()).data.user?.id || ''
        });
        
        const { data: newBank } = await supabase
          .from('question_banks')
          .insert(bankData)
          .select()
          .single();
        
        questionBank = newBank;
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Process questions in batches of 50
      for (let i = 0; i < questionsArray.length; i += 50) {
        const batch = questionsArray.slice(i, i + 50);
        
        for (const questionData of batch) {
          try {
            // Create the question
            const { data: questionRecord, error: questionError } = await supabase
              .from('questions')
              .insert({
                question_text: questionData.question,
                question_type: questionData.type,
                difficulty_level: questionData.difficulty,
                points: questionData.points,
                explanation: questionData.explanation || null,
                created_by: (await supabase.auth.getUser()).data.user?.id || '',
                question_bank_id: questionBank?.id,
                class_id: classId
              })
              .select()
              .single();

            if (questionError) throw questionError;

            // Create options if applicable
            if (questionData.options && questionData.options.length > 0) {
              const optionsToInsert = questionData.options.map((opt, index) => ({
                question_id: questionRecord.id,
                option_text: opt.text,
                is_correct: opt.isCorrect,
                option_order: index + 1,
              }));

              const { error: optionsError } = await supabase
                .from('question_options')
                .insert(optionsToInsert);

              if (optionsError) throw optionsError;
            }

            successCount++;
          } catch (error: any) {
            failedCount++;
            errors.push(`Question ${i + batch.indexOf(questionData) + 1}: ${error.message}`);
          }
        }
      }

      setResults({
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10) // Show only first 10 errors
      });

      if (successCount > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${successCount} questions${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
        });
      }

    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import questions',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const parseQuestionsText = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const questions: any[] = [];
    
    let currentQuestion: any = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if line starts with a number (new question)
      if (/^\d+\./.test(trimmedLine)) {
        // Save previous question if exists
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        
        // Start new question
        currentQuestion = {
          question: trimmedLine.replace(/^\d+\.\s*/, ''),
          type: 'mcq',
          difficulty: 'medium',
          points: 1,
          options: [],
          explanation: ''
        };
      }
      // Check if line is an option (A, B, C, D)
      else if (/^[A-D][\.\)]\s*/.test(trimmedLine) && currentQuestion) {
        const optionText = trimmedLine.replace(/^[A-D][\.\)]\s*/, '');
        const isCorrect = trimmedLine.includes('*') || trimmedLine.includes('(correct)');
        
        currentQuestion.options.push({
          text: optionText.replace(/\s*\*\s*|\s*\(correct\)\s*/g, ''),
          isCorrect
        });
      }
      // Check if line contains answer info
      else if (trimmedLine.toLowerCase().startsWith('answer:') && currentQuestion) {
        const answerLetter = trimmedLine.replace(/answer:\s*/i, '').charAt(0).toUpperCase();
        const answerIndex = answerLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
        
        if (currentQuestion.options[answerIndex]) {
          // Reset all options to false, then mark correct one
          currentQuestion.options.forEach((opt: any) => opt.isCorrect = false);
          currentQuestion.options[answerIndex].isCorrect = true;
        }
      }
      // Check for explanation
      else if (trimmedLine.toLowerCase().startsWith('explanation:') && currentQuestion) {
        currentQuestion.explanation = trimmedLine.replace(/explanation:\s*/i, '');
      }
    }
    
    // Add the last question
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    return questions;
  };

  const sampleFormat = `1. What is the capital of Nigeria?
A. Lagos
B. Abuja *
C. Kano
D. Port Harcourt
Answer: B
Explanation: Abuja is the capital city of Nigeria.

2. Which of the following is a prime number?
A. 4
B. 6
C. 7 *
D. 8
Answer: C`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Bulk Question Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={subjectId} onValueChange={setSubjectId} required>
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
              <Select value={classId} onValueChange={setClassId} required>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="questions">Questions (Max 1000) *</Label>
            <Textarea
              id="questions"
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              onPaste={(e) => {
                // Ensure paste is allowed and properly handled
                e.stopPropagation();
              }}
              placeholder="Paste your questions here... (Ctrl+V or right-click to paste)"
              rows={10}
              className="font-mono text-sm resize-y"
              required
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
            <p className="text-sm text-muted-foreground">
              Questions found: {parseQuestionsText(questionsText).length}
            </p>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleBulkImport} 
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Import Questions'}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {(results.success > 0 || results.failed > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 mb-4">
              <Badge variant="default" className="flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Success: {results.success}
              </Badge>
              {results.failed > 0 && (
                <Badge variant="destructive" className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Failed: {results.failed}
                </Badge>
              )}
            </div>
            
            {results.errors.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-destructive">Errors:</Label>
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {results.errors.map((error, index) => (
                    <p key={index} className="text-sm text-destructive">{error}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sample Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Sample Format
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
            {sampleFormat}
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            Use asterisk (*) or "(correct)" to mark correct answers. Include "Answer:" and "Explanation:" lines for better parsing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};