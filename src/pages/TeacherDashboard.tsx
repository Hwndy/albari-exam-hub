import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users, FileText } from 'lucide-react';
import { QuestionBank } from '@/components/teacher/QuestionBank';
import { ExamBuilder } from '@/components/teacher/ExamBuilder';
import { ExamResults } from '@/components/teacher/ExamResults';

export const TeacherDashboard = () => {
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
                  <p className="text-2xl font-bold">12</p>
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
                  <p className="text-2xl font-bold">245</p>
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
                  <p className="text-2xl font-bold">89</p>
                  <p className="text-sm text-muted-foreground">Student Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="exams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="exams">My Exams</TabsTrigger>
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
            <TabsTrigger value="results">Student Results</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="exams" className="space-y-6">
            <ExamBuilder />
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            <QuestionBank />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <ExamResults />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <p>Analytics and performance data will be displayed here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};