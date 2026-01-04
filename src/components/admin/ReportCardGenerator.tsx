import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Download, Mail, Loader2, Users, BookOpen, Award, TrendingUp, Printer, Eye } from 'lucide-react';

interface ClassData {
  id: string;
  name: string;
}

interface SubjectData {
  id: string;
  name: string;
}

interface StudentData {
  id: string;
  full_name: string;
  user_id: string;
}

interface GradeEntry {
  student_id: string;
  student_name: string;
  subject_id: string;
  subject_name: string;
  obtained_score: number;
  max_score: number;
  percentage: number;
  grade: string;
}

interface StudentReportCard {
  student_id: string;
  student_name: string;
  class_name: string;
  term: string;
  academic_year: string;
  grades: GradeEntry[];
  total_obtained: number;
  total_max: number;
  average: number;
  position: number;
  total_students: number;
  overall_grade: string;
  remarks: string;
}

const GRADING_SCALE = [
  { min: 75, max: 100, grade: 'A1', remark: 'Excellent' },
  { min: 70, max: 74, grade: 'B2', remark: 'Very Good' },
  { min: 65, max: 69, grade: 'B3', remark: 'Good' },
  { min: 60, max: 64, grade: 'C4', remark: 'Credit' },
  { min: 55, max: 59, grade: 'C5', remark: 'Credit' },
  { min: 50, max: 54, grade: 'C6', remark: 'Credit' },
  { min: 45, max: 49, grade: 'D7', remark: 'Pass' },
  { min: 40, max: 44, grade: 'E8', remark: 'Pass' },
  { min: 0, max: 39, grade: 'F9', remark: 'Fail' },
];

const TERMS = ['First Term', 'Second Term', 'Third Term'];

export const ReportCardGenerator: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { withSchoolFilter, schoolId } = useSchoolQuery();

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [reportCards, setReportCards] = useState<StudentReportCard[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [academicYear, setAcademicYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewingCard, setPreviewingCard] = useState<StudentReportCard | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [schoolId]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsAndGrades();
    }
  }, [selectedClass, selectedTerm, academicYear]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        withSchoolFilter(supabase.from('classes').select('id, name').order('name')),
        withSchoolFilter(supabase.from('subjects').select('id, name').order('name')),
      ]);

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);

      if (classesRes.data && classesRes.data.length > 0) {
        setSelectedClass(classesRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentsAndGrades = async () => {
    if (!selectedClass) return;

    try {
      // Fetch students in the class
      const { data: classAssignments } = await supabase
        .from('class_assignments')
        .select('student_id')
        .eq('class_id', selectedClass);

      const studentUserIds = classAssignments?.map(ca => ca.student_id) || [];
      
      if (studentUserIds.length === 0) {
        setStudents([]);
        setReportCards([]);
        return;
      }

      // Fetch student profiles (student_id in class_assignments is actually user_id from profiles)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', studentUserIds);

      // Fetch students table for proper IDs
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, user_id')
        .in('user_id', studentUserIds);

      const studentsList = (profiles || []).map(p => {
        const studentRecord = studentsData?.find(s => s.user_id === p.user_id);
        return {
          id: studentRecord?.id || p.user_id,
          full_name: p.full_name,
          user_id: p.user_id,
        };
      });

      setStudents(studentsList);

      // Fetch gradebook entries for these students
      const studentIds = studentsData?.map(s => s.id) || [];
      if (studentIds.length === 0) {
        setReportCards([]);
        return;
      }

      const { data: grades } = await supabase
        .from('gradebook_entries')
        .select('*, subjects(name)')
        .in('student_id', studentIds)
        .eq('class_id', selectedClass);

      // Process grades into report cards
      const className = classes.find(c => c.id === selectedClass)?.name || '';
      const processedCards = generateReportCards(studentsList, grades || [], className);
      setReportCards(processedCards);
    } catch (error) {
      console.error('Error fetching students and grades:', error);
    }
  };

  const getGrade = (percentage: number): string => {
    const scale = GRADING_SCALE.find(s => percentage >= s.min && percentage <= s.max);
    return scale?.grade || 'F9';
  };

  const getRemarks = (average: number): string => {
    const scale = GRADING_SCALE.find(s => average >= s.min && average <= s.max);
    return scale?.remark || 'Fail';
  };

  const generateReportCards = (
    studentsList: StudentData[], 
    grades: any[], 
    className: string
  ): StudentReportCard[] => {
    const cards: StudentReportCard[] = [];
    const studentAverages: { id: string; average: number }[] = [];

    // First pass: calculate averages for positioning
    studentsList.forEach(student => {
      const studentGrades = grades.filter(g => g.student_id === student.id);
      if (studentGrades.length === 0) {
        studentAverages.push({ id: student.id, average: 0 });
        return;
      }

      const totalObtained = studentGrades.reduce((sum, g) => sum + (g.obtained_score || 0), 0);
      const totalMax = studentGrades.reduce((sum, g) => sum + (g.max_score || 0), 0);
      const average = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      studentAverages.push({ id: student.id, average });
    });

    // Sort by average for positions
    studentAverages.sort((a, b) => b.average - a.average);
    const positionMap = new Map(studentAverages.map((s, i) => [s.id, i + 1]));

    // Second pass: generate full report cards
    studentsList.forEach(student => {
      const studentGrades = grades.filter(g => g.student_id === student.id);
      
      const gradeEntries: GradeEntry[] = studentGrades.map(g => {
        const percentage = g.max_score > 0 ? (g.obtained_score / g.max_score) * 100 : 0;
        return {
          student_id: student.id,
          student_name: student.full_name,
          subject_id: g.subject_id,
          subject_name: g.subjects?.name || 'Unknown',
          obtained_score: g.obtained_score || 0,
          max_score: g.max_score || 0,
          percentage: Math.round(percentage * 10) / 10,
          grade: getGrade(percentage),
        };
      });

      const totalObtained = gradeEntries.reduce((sum, g) => sum + g.obtained_score, 0);
      const totalMax = gradeEntries.reduce((sum, g) => sum + g.max_score, 0);
      const average = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

      cards.push({
        student_id: student.id,
        student_name: student.full_name,
        class_name: className,
        term: selectedTerm,
        academic_year: academicYear,
        grades: gradeEntries,
        total_obtained: totalObtained,
        total_max: totalMax,
        average: Math.round(average * 10) / 10,
        position: positionMap.get(student.id) || studentsList.length,
        total_students: studentsList.length,
        overall_grade: getGrade(average),
        remarks: getRemarks(average),
      });
    });

    return cards.sort((a, b) => a.position - b.position);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(reportCards.map(r => r.student_id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handlePreview = (card: StudentReportCard) => {
    setPreviewingCard(card);
    setPreviewOpen(true);
  };

  const handlePrintReportCard = (card: StudentReportCard) => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generatePrintableHTML(card);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const generatePrintableHTML = (card: StudentReportCard): string => {
    const gradeRows = card.grades.map(g => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${g.subject_name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${g.obtained_score}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${g.max_score}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${g.percentage}%</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${g.grade}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Card - ${card.student_name}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .school-name { font-size: 24px; font-weight: bold; color: #1a365d; }
          .report-title { font-size: 18px; margin-top: 10px; }
          .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
          .info-item { display: flex; gap: 8px; }
          .info-label { font-weight: bold; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #1a365d; color: white; padding: 12px 8px; text-align: left; }
          th:not(:first-child) { text-align: center; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .summary-card { padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; }
          .summary-value { font-size: 24px; font-weight: bold; color: #1a365d; }
          .summary-label { color: #666; font-size: 12px; }
          .grading-scale { margin-top: 30px; font-size: 12px; color: #666; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 50px; }
          .signature-line { border-top: 1px solid #333; padding-top: 5px; text-align: center; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">School Name</div>
          <div class="report-title">Student Report Card</div>
          <div>${card.term} - Academic Year ${card.academic_year}</div>
        </div>

        <div class="student-info">
          <div class="info-item"><span class="info-label">Name:</span> ${card.student_name}</div>
          <div class="info-item"><span class="info-label">Class:</span> ${card.class_name}</div>
          <div class="info-item"><span class="info-label">Position:</span> ${card.position} of ${card.total_students}</div>
          <div class="info-item"><span class="info-label">Overall Grade:</span> ${card.overall_grade}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Score</th>
              <th>Max</th>
              <th>Percentage</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            ${gradeRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-card">
            <div class="summary-value">${card.total_obtained}/${card.total_max}</div>
            <div class="summary-label">Total Score</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${card.average}%</div>
            <div class="summary-label">Average</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${card.position}/${card.total_students}</div>
            <div class="summary-label">Position</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${card.overall_grade}</div>
            <div class="summary-label">Grade</div>
          </div>
        </div>

        <div>
          <strong>Remarks:</strong> ${card.remarks}
        </div>

        <div class="grading-scale">
          <strong>Grading Scale:</strong> A1 (75-100) | B2 (70-74) | B3 (65-69) | C4 (60-64) | C5 (55-59) | C6 (50-54) | D7 (45-49) | E8 (40-44) | F9 (0-39)
        </div>

        <div class="signatures">
          <div class="signature-line">Class Teacher</div>
          <div class="signature-line">Principal</div>
          <div class="signature-line">Parent/Guardian</div>
        </div>
      </body>
      </html>
    `;
  };

  const handleBulkPrint = () => {
    const selectedCards = reportCards.filter(r => selectedStudents.has(r.student_id));
    if (selectedCards.length === 0) {
      toast({ title: 'No Selection', description: 'Please select students to print', variant: 'destructive' });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = selectedCards.map(card => generatePrintableHTML(card)).join('<div style="page-break-after: always;"></div>');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Report Cards</title></head>
      <body>${htmlContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Report Card Generator</h2>
          <p className="text-muted-foreground">Generate and print student report cards</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Class & Term</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map(term => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g., 2025"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          onClick={handleBulkPrint}
          disabled={selectedStudents.size === 0}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Selected ({selectedStudents.size})
        </Button>
      </div>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          {reportCards.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStudents.size === reportCards.length && reportCards.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-center">Subjects</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Average</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportCards.map((card) => (
                  <TableRow key={card.student_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.has(card.student_id)}
                        onCheckedChange={(checked) => handleSelectStudent(card.student_id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={card.position <= 3 ? 'default' : 'secondary'}>
                        {card.position}/{card.total_students}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{card.student_name}</TableCell>
                    <TableCell className="text-center">{card.grades.length}</TableCell>
                    <TableCell className="text-center">{card.total_obtained}/{card.total_max}</TableCell>
                    <TableCell className="text-center font-medium">{card.average}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={card.average >= 50 ? 'default' : 'destructive'}>
                        {card.overall_grade}
                      </Badge>
                    </TableCell>
                    <TableCell>{card.remarks}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handlePreview(card)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handlePrintReportCard(card)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No grades found for the selected class and term.</p>
              <p className="text-sm">Add grades in the Gradebook to generate report cards.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Report Card Preview</DialogTitle>
          </DialogHeader>
          {previewingCard && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <span className="text-muted-foreground text-sm">Student Name</span>
                  <p className="font-medium">{previewingCard.student_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Class</span>
                  <p className="font-medium">{previewingCard.class_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Term</span>
                  <p className="font-medium">{previewingCard.term}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Position</span>
                  <p className="font-medium">{previewingCard.position} of {previewingCard.total_students}</p>
                </div>
              </div>

              {/* Grades Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Max</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewingCard.grades.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell>{g.subject_name}</TableCell>
                      <TableCell className="text-center">{g.obtained_score}</TableCell>
                      <TableCell className="text-center">{g.max_score}</TableCell>
                      <TableCell className="text-center">{g.percentage}%</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={g.percentage >= 50 ? 'default' : 'destructive'}>
                          {g.grade}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-lg font-bold">{previewingCard.total_obtained}/{previewingCard.total_max}</div>
                    <div className="text-xs text-muted-foreground">Total Score</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-lg font-bold">{previewingCard.average}%</div>
                    <div className="text-xs text-muted-foreground">Average</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-lg font-bold">{previewingCard.position}/{previewingCard.total_students}</div>
                    <div className="text-xs text-muted-foreground">Position</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-lg font-bold">{previewingCard.overall_grade}</div>
                    <div className="text-xs text-muted-foreground">Grade</div>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <span className="font-medium">Remarks: </span>
                <span>{previewingCard.remarks}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={() => previewingCard && handlePrintReportCard(previewingCard)}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
