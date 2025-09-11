import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, School, FileText, Shield } from 'lucide-react';
import { UserManagement } from '@/components/admin/UserManagement';
import { ClassManagement } from '@/components/admin/ClassManagement';
import { SubjectManagement } from '@/components/admin/SubjectManagement';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types/auth';
import type { Exam } from '@/types/exam';

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@albari.edu',
    name: 'System Admin',
    role: 'admin',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    email: 'teacher1@albari.edu',
    name: 'John Teacher',
    role: 'teacher',
    subject: 'Mathematics',
    createdAt: '2024-01-02',
  },
  {
    id: '3',
    email: 'student1@albari.edu',
    name: 'Jane Student',
    role: 'student',
    class: 'JSS 1',
    createdAt: '2024-01-03',
  },
];

const mockSubjects = [
  { id: '1', name: 'Mathematics', teachers: 3, students: 120 },
  { id: '2', name: 'English Language', teachers: 2, students: 120 },
  { id: '3', name: 'Basic Science', teachers: 2, students: 120 },
  { id: '4', name: 'Social Studies', teachers: 2, students: 120 },
];

const mockClasses = [
  { id: '1', name: 'JSS 1', students: 40, subjects: 8 },
  { id: '2', name: 'JSS 2', students: 35, subjects: 8 },
  { id: '3', name: 'JSS 3', students: 45, subjects: 9 },
  { id: '4', name: 'SSS 1', students: 30, subjects: 12 },
  { id: '5', name: 'SSS 2', students: 28, subjects: 12 },
  { id: '6', name: 'SSS 3', students: 32, subjects: 12 },
];

const mockExams: Exam[] = [
  {
    id: '1',
    title: 'Mathematics Mid-Term',
    subject: 'Mathematics',
    class: 'JSS 1',
    duration: 60,
    totalQuestions: 20,
    questions: [],
    randomizeQuestions: true,
    shuffleAnswers: true,
    createdBy: 'teacher1',
    createdAt: '2024-01-10',
    status: 'published',
  },
  {
    id: '2',
    title: 'English Quiz',
    subject: 'English',
    class: 'JSS 2',
    duration: 45,
    totalQuestions: 15,
    questions: [],
    randomizeQuestions: false,
    shuffleAnswers: true,
    createdBy: 'teacher2',
    createdAt: '2024-01-12',
    status: 'draft',
  },
];

export const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [subjects, setSubjects] = useState(mockSubjects);
  const [classes, setClasses] = useState(mockClasses);
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const { toast } = useToast();

  // Add User Form State
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'student' as 'admin' | 'teacher' | 'student',
    subject: '',
    class: '',
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: Date.now().toString(),
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      subject: userForm.role === 'teacher' ? userForm.subject : undefined,
      class: userForm.role === 'student' ? userForm.class : undefined,
      createdAt: new Date().toISOString(),
    };
    
    setUsers([...users, newUser]);
    setIsAddingUser(false);
    setUserForm({
      name: '',
      email: '',
      role: 'student',
      subject: '',
      class: '',
    });
    
    toast({
      title: 'User Added',
      description: `${newUser.name} has been added as ${newUser.role}.`,
    });
  };

  const getTotalStudents = () => users.filter(u => u.role === 'student').length;
  const getTotalTeachers = () => users.filter(u => u.role === 'teacher').length;
  const getTotalExams = () => exams.length;
  const getActiveExams = () => exams.filter(e => e.status === 'published').length;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{getTotalStudents()}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{getTotalTeachers()}</p>
                  <p className="text-sm text-muted-foreground">Total Teachers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <School className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{classes.length}</p>
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{getActiveExams()}/{getTotalExams()}</p>
                  <p className="text-sm text-muted-foreground">Active Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Manage Users</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="exams">Exams</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-6">
            <ClassManagement />
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-6">
            <SubjectManagement />
          </TabsContent>

          {/* Exams Tab */}
          <TabsContent value="exams" className="space-y-6">
            <h2 className="text-2xl font-bold">All Exams</h2>
            
            <div className="grid gap-4">
              {exams.map((exam) => (
                <Card key={exam.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">{exam.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{exam.subject}</span>
                          <span>•</span>
                          <span>{exam.class}</span>
                          <span>•</span>
                          <span>{exam.duration} minutes</span>
                          <span>•</span>
                          <span>{exam.totalQuestions} questions</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>
                            {exam.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Created: {new Date(exam.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};