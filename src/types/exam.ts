export interface Question {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  duration: number; // in minutes
  totalQuestions: number;
  questions: Question[];
  randomizeQuestions: boolean;
  shuffleAnswers: boolean;
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'published' | 'archived';
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, string>;
  timeSpent: number;
  completedAt: string;
}

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  answers: Record<string, string>;
  timeRemaining: number;
  currentQuestion: number;
}