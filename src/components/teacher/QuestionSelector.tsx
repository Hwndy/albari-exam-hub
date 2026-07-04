import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Eye, 
  BookOpen, 
  CheckCircle, 
  AlertCircle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'fill_blank' | 'diagram';
  difficulty_level: 'easy' | 'medium' | 'hard';
  points: number;
  options: Array<{
    id: string;
    option_text: string;
    is_correct: boolean;
    option_order: number;
  }>;
  explanation?: string;
  subject_name: string;
  created_at: string;
}

interface QuestionSelectorProps {
  subjectId?: string;
  selectedQuestions: string[];
  onQuestionsChange: (questionIds: string[]) => void;
  maxQuestions?: number;
}

export const QuestionSelector: React.FC<QuestionSelectorProps> = ({
  subjectId,
  selectedQuestions,
  onQuestionsChange,
  maxQuestions
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { toast } = useToast();
  useEffect(() => {
    if (subjectId) {
      fetchQuestions();
    } else {
      setQuestions([]);
      setFilteredQuestions([]);
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchTerm, difficultyFilter, typeFilter]);

  const fetchQuestions = async () => {
    if (!subjectId) return;

    try {
      setLoading(true);
      
      // First get questions for the subject
      const { data: questionBanks } = await 
        supabase
          .from('question_banks')
          .select('id')
          .eq('subject_id', subjectId)
      ;

      if (!questionBanks || questionBanks.length === 0) {
        setQuestions([]);
        return;
      }

      const bankIds = questionBanks.map(bank => bank.id);
      
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select(`
          *,
          question_options(*),
          question_banks(
            id,
            name,
            subject_id,
            class_id,
            subjects(name),
            classes(name)
          )
        `)
        .in('question_bank_id', bankIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (questionsData) {
        const formattedQuestions = questionsData.map(q => ({
          ...q,
          options: q.question_options?.sort((a: any, b: any) => a.option_order - b.option_order) || [],
          subject_name: q.question_banks?.subjects?.name || 'Unknown',
          class_name: q.question_banks?.classes?.name || 'All Classes'
        }));
        setQuestions(formattedQuestions);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = questions;

    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.question_text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(q => q.difficulty_level === difficultyFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(q => q.question_type === typeFilter);
    }

    setFilteredQuestions(filtered);
  };

  const handleQuestionSelect = (questionId: string, selected: boolean) => {
    let newSelection: string[];
    
    if (selected) {
      if (maxQuestions && selectedQuestions.length >= maxQuestions) {
        toast({
          title: 'Maximum Questions Reached',
          description: `You can only select up to ${maxQuestions} questions.`,
          variant: 'destructive',
        });
        return;
      }
      newSelection = [...selectedQuestions, questionId];
    } else {
      newSelection = selectedQuestions.filter(id => id !== questionId);
    }
    
    onQuestionsChange(newSelection);
  };

  const handleSelectAll = () => {
    const availableIds = filteredQuestions.map(q => q.id);
    const maxToSelect = maxQuestions ? Math.min(maxQuestions, availableIds.length) : availableIds.length;
    const toSelect = availableIds.slice(0, maxToSelect);
    onQuestionsChange(toSelect);
  };

  const handleClearAll = () => {
    onQuestionsChange([]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mcq': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'fill_blank': return 'Fill in the Blank';
      default: return type;
    }
  };

  if (!subjectId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Subject First</h3>
          <p className="text-muted-foreground">
            Please select a subject in the Basic Info tab to view available questions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading questions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {selectedQuestions.length} of {filteredQuestions.length} selected
            {maxQuestions && ` (max: ${maxQuestions})`}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={!filteredQuestions.length}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={!selectedQuestions.length}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search Questions</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search question text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Question Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mcq">Multiple Choice</SelectItem>
              <SelectItem value="true_false">True/False</SelectItem>
              <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <Button variant="outline" className="w-full" onClick={fetchQuestions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Separator />

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Questions Found</h3>
            <p className="text-muted-foreground">
              {questions.length === 0 
                ? "No questions available for this subject. Create some questions first."
                : "No questions match your current filters. Try adjusting the search criteria."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {filteredQuestions.map((question) => (
              <Card key={question.id} className={`transition-colors ${
                selectedQuestions.includes(question.id) 
                  ? 'border-primary bg-primary/5' 
                  : 'hover:bg-accent/50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedQuestions.includes(question.id)}
                      onCheckedChange={(checked) => 
                        handleQuestionSelect(question.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium line-clamp-2">
                            {question.question_text}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge variant="outline" className={getDifficultyColor(question.difficulty_level)}>
                            {question.difficulty_level}
                          </Badge>
                          <Badge variant="secondary">
                            {getTypeLabel(question.question_type)}
                          </Badge>
                          <Badge variant="outline">
                            {question.points} pt{question.points !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                      
                      {question.question_type === 'mcq' && question.options.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {question.options.slice(0, 4).map((option, index) => (
                              <div key={option.id} className="flex items-center space-x-1">
                                <span className={`w-4 h-4 rounded text-xs flex items-center justify-center ${
                                  option.is_correct 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {String.fromCharCode(65 + index)}
                                </span>
                                <span className={`line-clamp-1 ${option.is_correct ? 'font-medium' : ''}`}>
                                  {option.option_text}
                                </span>
                                {option.is_correct && <CheckCircle className="h-3 w-3 text-green-600" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};