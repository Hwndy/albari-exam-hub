import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, FileText, Plus } from 'lucide-react';
import { ConsolidatedExamCreator } from '@/components/shared/ConsolidatedExamCreator';
import { TeacherExamBuilder } from '@/components/teacher/TeacherExamBuilder';
import { EnhancedExamResults } from '@/components/teacher/EnhancedExamResults';
import { TeacherStudentCreator } from '@/components/teacher/TeacherStudentCreator';
import { TeacherClassAssignment } from '@/components/admin/TeacherClassAssignment';
import { useAuth } from '@/contexts/AuthContext';

export const TeacherDashboard = () => {
  const { user } = useAuth();
  
  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Total Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-success/10 rounded-lg">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Questions Bank</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Users className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Student Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="exams" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
              <TabsTrigger value="exams" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">My Exams</TabsTrigger>
              <TabsTrigger value="results" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Student Results</TabsTrigger>
              <TabsTrigger value="students" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Create Student</TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs sm:text-sm px-3 py-2 whitespace-nowrap">Class Assignments</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="exams" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">My Exams</h2>
              <ConsolidatedExamCreator
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Exam
                  </Button>
                }
                isTeacher={true}
                onExamCreated={() => window.location.reload()}
              />
            </div>
            <TeacherExamBuilder />
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Student Results</h2>
            </div>
            <EnhancedExamResults />
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Create Students</h2>
            </div>
            <TeacherStudentCreator />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold">Teacher Class Assignments</h2>
            </div>
            <TeacherClassAssignment teacherId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};