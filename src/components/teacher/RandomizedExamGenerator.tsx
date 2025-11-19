import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Shuffle, 
  Plus, 
  Minus,
  BookOpen,
  Target,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';

interface RandomizedExamGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onExamCreated: (examId: string) => void;
}

interface QuestionCriteria {
  subjectId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
}

export const RandomizedExamGenerator: React.FC<RandomizedExamGeneratorProps> = ({
  isOpen,
  onClose,
  onExamCreated,
}) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Record<string, Record<string, number>>>({});
  const [criteria, setCriteria] = useState<QuestionCriteria[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [duration, setDuration] = useState([60]);
  const [passmark, setPassmark] = useState([50]);
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [questionsPerStudent, setQuestionsPerStudent] = useState([20]);
  const [generating, setGenerating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { withSchoolFilter, withSchoolData } = useSchoolQuery();

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      // Fetch subjects
      const { data: subjectsData } = await withSchoolFilter(
        supabase
          .from('subjects')
          .select('*')
          .order('name')
      );

      // Fetch classes
      const { data: classesData } = await withSchoolFilter(
        supabase
          .from('classes')
          .select('*')
          .order('name')
      );

      // Fetch question banks with question counts
      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          difficulty_level,
          question_banks!inner(
            id,
            name,
            subject_id,
            subjects(name)
          )
        `);

      if (subjectsData) setSubjects(subjectsData);
      if (classesData) setClasses(classesData);

      // Process available questions count by subject and difficulty
      if (questionsData) {
        const questionCounts: Record<string, Record<string, number>> = {};
        
        questionsData.forEach((q: any) => {
          const subjectId = q.question_banks.subject_id;
          const difficulty = q.difficulty_level;
          
          if (!questionCounts[subjectId]) {
            questionCounts[subjectId] = { easy: 0, medium: 0, hard: 0 };
          }
          
          questionCounts[subjectId][difficulty] = (questionCounts[subjectId][difficulty] || 0) + 1;
        });
        
        setAvailableQuestions(questionCounts);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    }
  };

  const addCriteria = () => {
    if (subjects.length > 0) {
      setCriteria([...criteria, {
        subjectId: subjects[0].id,
        difficulty: 'medium',
        count: 5,
      }]);
    }
  };

  const removeCriteria = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriteria = (index: number, field: keyof QuestionCriteria, value: any) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setCriteria(newCriteria);
  };

  const getTotalQuestions = () => {
    return criteria.reduce((sum, c) => sum + c.count, 0);
  };

  const getAvailableCount = (subjectId: string, difficulty: string) => {
    return availableQuestions[subjectId]?.[difficulty] || 0;
  };

  const validateCriteria = () => {
    for (const c of criteria) {
      const available = getAvailableCount(c.subjectId, c.difficulty);
      if (c.count > available) {
        return `Not enough ${c.difficulty} questions available for ${subjects.find(s => s.id === c.subjectId)?.name}. Available: ${available}, Requested: ${c.count}`;
      }
    }
    return null;
  };

  const generateExam = async () => {
    const validationError = validateCriteria();
    if (validationError) {
      toast({
        title: 'Invalid Configuration',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    if (!examTitle.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter an exam title',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);

      // Create exam
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert({
          title: examTitle,
          description: examDescription,
          duration_minutes: duration[0],
          pass_mark: passmark[0],
          total_questions: getTotalQuestions(),
          questions_per_student: questionsPerStudent[0],
          question_pool_size: getTotalQuestions(),
          class_id: classId || null,
          created_by: user?.id || '',
          status: 'draft',
          randomize_questions: true,
          shuffle_answers: true,
        })
        .select()
        .single();

      if (examError) throw examError;

      // Generate questions for each criteria
      let questionOrder = 1;
      
      for (const c of criteria) {
        // Fetch random questions matching criteria
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select(`
            id,
            points,
            question_banks!inner(subject_id)
          `)
          .eq('question_banks.subject_id', c.subjectId)
          .eq('difficulty_level', c.difficulty)
          .limit(c.count * 2); // Fetch more than needed for randomization

        if (questionsError) throw questionsError;

        // Randomly select questions
        const shuffled = questions?.sort(() => 0.5 - Math.random()) || [];
        const selectedQuestions = shuffled.slice(0, c.count);

        // Insert exam questions
        const examQuestions = selectedQuestions.map(q => ({
          exam_id: examData.id,
          question_id: q.id,
          question_order: questionOrder++,
          points: q.points || 1,
        }));

        const { error: examQuestionsError } = await supabase
          .from('exam_questions')
          .insert(examQuestions);

        if (examQuestionsError) throw examQuestionsError;
      }

      toast({
        title: 'Exam Generated',
        description: `Successfully created "${examTitle}" with ${getTotalQuestions()} questions`,
      });

      onExamCreated(examData.id);
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setExamTitle('');
    setExamDescription('');
    setCriteria([]);
    setDuration([60]);
    setPassmark([50]);
    setQuestionsPerStudent([20]);
    setClassId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shuffle className="h-5 w-5 mr-2" />
            Generate Randomized Exam
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exam Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Exam Title</Label>
                  <Input
                    id="title"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Enter exam title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class (Optional)</Label>
                  <Select value={classId || "all"} onValueChange={(value) => setClassId(value === "all" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.filter(cls => cls.id && cls.id.trim()).map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={examDescription}
                  onChange={(e) => setExamDescription(e.target.value)}
                  placeholder="Enter exam description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration: {duration[0]} minutes</Label>
                  <Slider
                    value={duration}
                    onValueChange={setDuration}
                    max={240}
                    min={15}
                    step={15}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pass Mark: {passmark[0]}%</Label>
                  <Slider
                    value={passmark}
                    onValueChange={setPassmark}
                    max={100}
                    min={10}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Questions per Student: {questionsPerStudent[0]} (from pool of {getTotalQuestions()})</Label>
                <Slider
                  value={questionsPerStudent}
                  onValueChange={setQuestionsPerStudent}
                  max={getTotalQuestions()}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Each student will receive {questionsPerStudent[0]} randomly selected questions from the total pool of {getTotalQuestions()} questions.
                </p>
               </div>
             </CardContent>
           </Card>

           {/* Question Criteria */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Question Selection Criteria</CardTitle>
              <Button onClick={addCriteria} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Criteria
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {criteria.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No criteria added yet. Click "Add Criteria" to start building your exam.
                </p>
              ) : (
                criteria.map((c, index) => (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Select
                            value={c.subjectId}
                            onValueChange={(value) => updateCriteria(index, 'subjectId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
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
                          <Label>Difficulty</Label>
                          <Select
                            value={c.difficulty}
                            onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                              updateCriteria(index, 'difficulty', value)
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
                          <Label>Questions</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={c.count}
                              onChange={(e) => updateCriteria(index, 'count', parseInt(e.target.value) || 0)}
                              min={1}
                              max={getAvailableCount(c.subjectId, c.difficulty)}
                            />
                            <Badge variant="outline" className="text-xs">
                              /{getAvailableCount(c.subjectId, c.difficulty)}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCriteria(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {criteria.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Questions:</span>
                      <Badge>{getTotalQuestions()}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Duration:</span>
                      <Badge variant="outline">{duration[0]} minutes</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Pass Mark:</span>
                      <Badge variant="outline">{passmark[0]}%</Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={generateExam} 
              disabled={criteria.length === 0 || generating}
            >
              {generating ? 'Generating...' : 'Generate Exam'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};