import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Filter, BookOpen, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty_level: string;
  points: number;
  subject_name: string;
  class_name: string;
  created_at: string;
}

interface QuestionCategorizerProps {
  questions: Question[];
  onFilter: (filteredQuestions: Question[]) => void;
}

export const QuestionCategorizer: React.FC<QuestionCategorizerProps> = ({
  questions,
  onFilter
}) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    subject: 'all',
    class: 'all',
    difficulty: 'all',
    type: 'all',
    search: ''
  });
  useEffect(() => {
    fetchSubjectsAndClasses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, questions]);

  const fetchSubjectsAndClasses = async () => {
    try {
      const [subjectsData, classesData] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('classes').select('*').order('name')
      ]);

      if (subjectsData.data) setSubjects(subjectsData.data);
      if (classesData.data) setClasses(classesData.data);
    } catch (error) {
      console.error('Error fetching subjects and classes:', error);
    }
  };

  const applyFilters = () => {
    let filtered = questions;

    // Filter by subject
    if (filters.subject !== 'all') {
      const selectedSubject = subjects.find(s => s.id === filters.subject);
      if (selectedSubject) {
        filtered = filtered.filter(q => q.subject_name === selectedSubject.name);
      }
    }

    // Filter by class
    if (filters.class !== 'all') {
      const selectedClass = classes.find(c => c.id === filters.class);
      if (selectedClass) {
        filtered = filtered.filter(q => q.class_name === selectedClass.name);
      }
    }

    // Filter by difficulty
    if (filters.difficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty_level === filters.difficulty);
    }

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(q => q.question_type === filters.type);
    }

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(searchLower)
      );
    }

    onFilter(filtered);
  };

  const clearFilters = () => {
    setFilters({
      subject: 'all',
      class: 'all',
      difficulty: 'all',
      type: 'all',
      search: ''
    });
  };

  const getFilterStats = () => {
    const stats = {
      bySubject: {} as Record<string, number>,
      byClass: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    questions.forEach(question => {
      // Subject stats
      stats.bySubject[question.subject_name] = (stats.bySubject[question.subject_name] || 0) + 1;
      
      // Class stats
      stats.byClass[question.class_name] = (stats.byClass[question.class_name] || 0) + 1;
      
      // Difficulty stats
      stats.byDifficulty[question.difficulty_level] = (stats.byDifficulty[question.difficulty_level] || 0) + 1;
      
      // Type stats
      stats.byType[question.question_type] = (stats.byType[question.question_type] || 0) + 1;
    });

    return stats;
  };

  const stats = getFilterStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Question Categories & Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Questions</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={filters.subject} onValueChange={(value) => setFilters({ ...filters, subject: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
              {subjects.filter(subject => subject.id && subject.id.trim()).map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={filters.class} onValueChange={(value) => setFilters({ ...filters, class: value })}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={filters.difficulty} onValueChange={(value) => setFilters({ ...filters, difficulty: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="fill_blank">Fill in Blank</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={clearFilters} size="sm">
            Clear Filters
          </Button>
        </div>

        {/* Category Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-3">
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              <Label className="font-medium">By Subject</Label>
            </div>
            <div className="space-y-2">
              {Object.entries(stats.bySubject).map(([subject, count]) => (
                <div key={subject} className="flex items-center justify-between">
                  <span className="text-sm">{subject}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              <Label className="font-medium">By Class</Label>
            </div>
            <div className="space-y-2">
              {Object.entries(stats.byClass).map(([className, count]) => (
                <div key={className} className="flex items-center justify-between">
                  <span className="text-sm">{className}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-medium">By Difficulty</Label>
            <div className="space-y-2">
              {Object.entries(stats.byDifficulty).map(([difficulty, count]) => (
                <div key={difficulty} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{difficulty}</span>
                  <Badge 
                    variant={
                      difficulty === 'hard' ? 'destructive' : 
                      difficulty === 'medium' ? 'default' : 'secondary'
                    }
                  >
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-medium">By Type</Label>
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm">
                    {type === 'mcq' ? 'Multiple Choice' : 
                     type === 'true_false' ? 'True/False' : 
                     type === 'fill_blank' ? 'Fill in Blank' : type}
                  </span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};