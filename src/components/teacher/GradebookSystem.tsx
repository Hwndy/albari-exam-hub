import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BookOpen, Plus, Calculator, TrendingUp, Award, Calendar as CalendarIcon, Search, Filter, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  admission_number: string;
  profiles?: {
    full_name: string;
  };
}

interface GradebookEntry {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  assessment_name: string;
  assessment_type: string;
  assessment_date: string;
  max_score: number;
  obtained_score: number;
  grade: string;
  remarks: string;
  teacher_id: string;
  students?: {
    admission_number: string;
    profiles?: {
      full_name: string;
    };
  };
  subjects?: {
    name: string;
  };
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

export const GradebookSystem = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradebookEntries, setGradebookEntries] = useState<GradebookEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newGrade, setNewGrade] = useState({
    student_id: '',
    subject_id: '',
    class_id: '',
    assessment_name: '',
    assessment_type: '',
    assessment_date: new Date(),
    max_score: '',
    obtained_score: '',
    remarks: ''
  });

  const [bulkAssessment, setBulkAssessment] = useState({
    subject_id: '',
    class_id: '',
    assessment_name: '',
    assessment_type: '',
    assessment_date: new Date(),
    max_score: ''
  });

  const [bulkGrades, setBulkGrades] = useState<Record<string, { obtained_score: string; remarks: string }>>({});

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchGradebookEntries();
    }
  }, [selectedClass, selectedSubject]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch teacher's class assignments
      const { data: classAssignments, error: classError } = await supabase
        .from('teacher_class_assignments')
        .select(`
          classes (
            id,
            name
          )
        `)
        .eq('teacher_id', user?.id);

      if (classError) throw classError;

      // Fetch teacher's subject assignments
      const { data: subjectAssignments, error: subjectError } = await supabase
        .from('subject_assignments')
        .select(`
          subjects (
            id,
            name
          )
        `)
        .eq('user_id', user?.id);

      if (subjectError) throw subjectError;

      setClasses(classAssignments?.map(ca => ca.classes).filter(Boolean) || []);
      setSubjects(subjectAssignments?.map(sa => sa.subjects).filter(Boolean) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      if (!selectedClass) return;

      const { data: classAssignments, error } = await supabase
        .from('class_assignments')
        .select(`
          students (
            id,
            admission_number,
            profiles:user_id (
              full_name
            )
          )
        `)
        .eq('class_id', selectedClass);

      if (error) throw error;

      const studentsList = classAssignments?.map(ca => ca.students).filter(Boolean) || [];
      setStudents(studentsList);

      // Initialize bulk grades for all students
      const initialBulkGrades: Record<string, { obtained_score: string; remarks: string }> = {};
      studentsList.forEach(student => {
        initialBulkGrades[student.id] = { obtained_score: '', remarks: '' };
      });
      setBulkGrades(initialBulkGrades);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    }
  };

  const fetchGradebookEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('gradebook_entries')
        .select(`
          *,
          subjects (
            name
          )
        `)
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .eq('teacher_id', user?.id)
        .order('assessment_date', { ascending: false });

      if (error) throw error;

      // Fetch student details separately
      const entriesWithStudents = await Promise.all(
        (data || []).map(async (entry) => {
          const { data: student } = await supabase
            .from('students')
            .select(`
              admission_number,
              profiles:user_id (
                full_name
              )
            `)
            .eq('id', entry.student_id)
            .single();

          return {
            ...entry,
            students: student
          };
        })
      );

      setGradebookEntries(entriesWithStudents);
    } catch (error) {
      console.error('Error fetching gradebook entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load gradebook entries',
        variant: 'destructive',
      });
    }
  };

  const calculateGrade = (obtained: number, max: number): string => {
    const percentage = (obtained / max) * 100;
    
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const handleAddGrade = async () => {
    try {
      if (!newGrade.student_id || !newGrade.subject_id || !newGrade.assessment_name || !newGrade.max_score || !newGrade.obtained_score) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      const maxScore = parseFloat(newGrade.max_score);
      const obtainedScore = parseFloat(newGrade.obtained_score);
      const grade = calculateGrade(obtainedScore, maxScore);

      const { error } = await supabase
        .from('gradebook_entries')
        .insert({
          student_id: newGrade.student_id,
          subject_id: newGrade.subject_id,
          class_id: newGrade.class_id,
          assessment_name: newGrade.assessment_name,
          assessment_type: newGrade.assessment_type,
          assessment_date: format(newGrade.assessment_date, 'yyyy-MM-dd'),
          max_score: maxScore,
          obtained_score: obtainedScore,
          grade,
          remarks: newGrade.remarks,
          teacher_id: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Grade added successfully',
      });

      setShowAddGrade(false);
      setNewGrade({
        student_id: '',
        subject_id: '',
        class_id: '',
        assessment_name: '',
        assessment_type: '',
        assessment_date: new Date(),
        max_score: '',
        obtained_score: '',
        remarks: ''
      });
      
      fetchGradebookEntries();
    } catch (error: any) {
      console.error('Error adding grade:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add grade',
        variant: 'destructive',
      });
    }
  };

  const handleBulkEntry = async () => {
    try {
      if (!bulkAssessment.subject_id || !bulkAssessment.class_id || !bulkAssessment.assessment_name || !bulkAssessment.max_score) {
        toast({
          title: 'Error',
          description: 'Please fill in all assessment details',
          variant: 'destructive',
        });
        return;
      }

      const maxScore = parseFloat(bulkAssessment.max_score);
      
      // Prepare bulk entries
      const entries = Object.entries(bulkGrades)
        .filter(([_, data]) => data.obtained_score !== '')
        .map(([studentId, data]) => {
          const obtainedScore = parseFloat(data.obtained_score);
          const grade = calculateGrade(obtainedScore, maxScore);
          
          return {
            student_id: studentId,
            subject_id: bulkAssessment.subject_id,
            class_id: bulkAssessment.class_id,
            assessment_name: bulkAssessment.assessment_name,
            assessment_type: bulkAssessment.assessment_type,
            assessment_date: format(bulkAssessment.assessment_date, 'yyyy-MM-dd'),
            max_score: maxScore,
            obtained_score: obtainedScore,
            grade,
            remarks: data.remarks,
            teacher_id: user?.id
          };
        });

      if (entries.length === 0) {
        toast({
          title: 'Error',
          description: 'Please enter scores for at least one student',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('gradebook_entries')
        .insert(entries);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${entries.length} grades added successfully`,
      });

      setShowBulkEntry(false);
      setBulkAssessment({
        subject_id: '',
        class_id: '',
        assessment_name: '',
        assessment_type: '',
        assessment_date: new Date(),
        max_score: ''
      });
      setBulkGrades({});
      
      fetchGradebookEntries();
    } catch (error: any) {
      console.error('Error adding bulk grades:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add grades',
        variant: 'destructive',
      });
    }
  };

  const getStudentAverage = (studentId: string): number => {
    const studentEntries = gradebookEntries.filter(entry => entry.student_id === studentId);
    if (studentEntries.length === 0) return 0;
    
    const total = studentEntries.reduce((sum, entry) => sum + (entry.obtained_score / entry.max_score) * 100, 0);
    return total / studentEntries.length;
  };

  const filteredEntries = gradebookEntries.filter(entry =>
    entry.students?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.students?.admission_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.assessment_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const assessmentTypes = [
    'Test',
    'Exam',
    'Assignment',
    'Project',
    'Quiz',
    'Presentation',
    'Lab Work',
    'Homework'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gradebook System</h2>
          <p className="text-muted-foreground">Manage grades and assessments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkEntry(true)}>
            <Calculator className="h-4 w-4 mr-2" />
            Bulk Entry
          </Button>
          <Button onClick={() => setShowAddGrade(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Grade
          </Button>
        </div>
      </div>

      {/* Class and Subject Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="class">Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
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
            <div className="flex-1">
              <Label htmlFor="subject">Select Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
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
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedSubject && (
        <Tabs defaultValue="grades" className="space-y-6">
          <TabsList>
            <TabsTrigger value="grades">Grade Entries</TabsTrigger>
            <TabsTrigger value="students">Student Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="grades" className="space-y-4">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search grades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Grades Table */}
            <Card>
              <CardHeader>
                <CardTitle>Grade Entries ({filteredEntries.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {entry.students?.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'S'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{entry.students?.profiles?.full_name}</p>
                                <p className="text-xs text-muted-foreground">{entry.students?.admission_number}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{entry.assessment_name}</TableCell>
                          <TableCell>{entry.assessment_type}</TableCell>
                          <TableCell>{format(new Date(entry.assessment_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            {entry.obtained_score}/{entry.max_score} ({Math.round((entry.obtained_score / entry.max_score) * 100)}%)
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              entry.grade === 'A+' || entry.grade === 'A' ? 'default' :
                              entry.grade === 'B+' || entry.grade === 'B' ? 'secondary' :
                              entry.grade === 'C' ? 'outline' :
                              'destructive'
                            }>
                              {entry.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{entry.remarks}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredEntries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No grade entries found. Start by adding some grades.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map((student) => {
                    const studentEntries = gradebookEntries.filter(entry => entry.student_id === student.id);
                    const average = getStudentAverage(student.id);
                    
                    return (
                      <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {student.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.profiles?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{student.admission_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Assessments</p>
                              <p className="font-semibold">{studentEntries.length}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Average</p>
                              <p className="font-semibold text-lg">
                                {average > 0 ? `${Math.round(average)}%` : 'N/A'}
                              </p>
                            </div>
                            <Badge variant={
                              average >= 80 ? 'default' :
                              average >= 60 ? 'secondary' :
                              average >= 50 ? 'outline' :
                              average > 0 ? 'destructive' :
                              'outline'
                            }>
                              {average > 0 ? calculateGrade(average, 100) : 'N/A'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Grade Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Analytics and performance insights will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Add Grade Dialog */}
      <Dialog open={showAddGrade} onOpenChange={setShowAddGrade}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Grade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student">Student *</Label>
              <Select value={newGrade.student_id} onValueChange={(value) => setNewGrade(prev => ({ ...prev, student_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.profiles?.full_name} ({student.admission_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={newGrade.subject_id} onValueChange={(value) => setNewGrade(prev => ({ ...prev, subject_id: value, class_id: selectedClass }))}>
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
            <div className="space-y-2">
              <Label htmlFor="assessment_name">Assessment Name *</Label>
              <Input
                id="assessment_name"
                value={newGrade.assessment_name}
                onChange={(e) => setNewGrade(prev => ({ ...prev, assessment_name: e.target.value }))}
                placeholder="e.g., Mid-term Exam"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment_type">Assessment Type</Label>
              <Select value={newGrade.assessment_type} onValueChange={(value) => setNewGrade(prev => ({ ...prev, assessment_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {assessmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assessment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newGrade.assessment_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(newGrade.assessment_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newGrade.assessment_date}
                    onSelect={(date) => setNewGrade(prev => ({ ...prev, assessment_date: date || new Date() }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="max_score">Max Score *</Label>
                <Input
                  id="max_score"
                  type="number"
                  value={newGrade.max_score}
                  onChange={(e) => setNewGrade(prev => ({ ...prev, max_score: e.target.value }))}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obtained_score">Obtained Score *</Label>
                <Input
                  id="obtained_score"
                  type="number"
                  value={newGrade.obtained_score}
                  onChange={(e) => setNewGrade(prev => ({ ...prev, obtained_score: e.target.value }))}
                  placeholder="85"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={newGrade.remarks}
                onChange={(e) => setNewGrade(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Optional remarks..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddGrade(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGrade}>
              Add Grade
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Entry Dialog */}
      <Dialog open={showBulkEntry} onOpenChange={setShowBulkEntry}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Grade Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Assessment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assessment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk_subject">Subject *</Label>
                    <Select value={bulkAssessment.subject_id} onValueChange={(value) => setBulkAssessment(prev => ({ ...prev, subject_id: value, class_id: selectedClass }))}>
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
                  <div className="space-y-2">
                    <Label htmlFor="bulk_assessment_name">Assessment Name *</Label>
                    <Input
                      id="bulk_assessment_name"
                      value={bulkAssessment.assessment_name}
                      onChange={(e) => setBulkAssessment(prev => ({ ...prev, assessment_name: e.target.value }))}
                      placeholder="e.g., Mid-term Exam"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk_assessment_type">Assessment Type</Label>
                    <Select value={bulkAssessment.assessment_type} onValueChange={(value) => setBulkAssessment(prev => ({ ...prev, assessment_type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {assessmentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk_max_score">Max Score *</Label>
                    <Input
                      id="bulk_max_score"
                      type="number"
                      value={bulkAssessment.max_score}
                      onChange={(e) => setBulkAssessment(prev => ({ ...prev, max_score: e.target.value }))}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assessment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !bulkAssessment.assessment_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(bulkAssessment.assessment_date, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={bulkAssessment.assessment_date}
                        onSelect={(date) => setBulkAssessment(prev => ({ ...prev, assessment_date: date || new Date() }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Student Grades */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar>
                          <AvatarFallback className="text-sm">
                            {student.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{student.admission_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Score"
                          value={bulkGrades[student.id]?.obtained_score || ''}
                          onChange={(e) => setBulkGrades(prev => ({
                            ...prev,
                            [student.id]: {
                              ...prev[student.id],
                              obtained_score: e.target.value
                            }
                          }))}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">/ {bulkAssessment.max_score || '100'}</span>
                        <Input
                          placeholder="Remarks (optional)"
                          value={bulkGrades[student.id]?.remarks || ''}
                          onChange={(e) => setBulkGrades(prev => ({
                            ...prev,
                            [student.id]: {
                              ...prev[student.id],
                              remarks: e.target.value
                            }
                          }))}
                          className="w-40"
                        />
                        {bulkGrades[student.id]?.obtained_score && bulkAssessment.max_score && (
                          <Badge>
                            {calculateGrade(
                              parseFloat(bulkGrades[student.id].obtained_score),
                              parseFloat(bulkAssessment.max_score)
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowBulkEntry(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkEntry}>
              Save All Grades
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};