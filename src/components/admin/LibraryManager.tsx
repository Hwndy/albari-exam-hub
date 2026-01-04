import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BookOpen, Plus, Search, Edit, Trash2, Loader2, 
  BookCheck, BookX, Clock, AlertTriangle, Users, BarChart3 
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  total_copies: number;
  available_copies: number;
  location: string;
}

interface BookIssue {
  id: string;
  book_id: string;
  student_id: string;
  issued_date: string;
  due_date: string;
  returned_date: string | null;
  fine_amount: number;
  status: string;
  issued_by: string;
  book?: Book;
  student?: { full_name: string };
}

interface StudentOption {
  id: string;
  full_name: string;
  user_id: string;
}

const CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History',
  'Literature', 'Geography', 'Religious Studies', 'Arts', 'Technology',
  'Reference', 'Biography', 'Children', 'Textbook', 'Other'
];

const FINE_PER_DAY = 50; // Naira per day overdue

export const LibraryManager: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { withSchoolFilter, schoolId } = useSchoolQuery();

  const [isLoading, setIsLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialog states
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Form states
  const [bookForm, setBookForm] = useState({
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    category: 'Textbook',
    total_copies: 1,
    location: '',
  });
  const [issueForm, setIssueForm] = useState({
    student_id: '',
    due_days: 14,
  });

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch books - cast to avoid deep type instantiation
      const booksQuery = supabase.from('library_books').select('*').eq('school_id', schoolId).order('title');
      const booksData = await (booksQuery as any);
      setBooks((booksData.data || []) as Book[]);

      // Fetch issues
      const issuesQuery = supabase.from('book_issues').select('*').eq('school_id', schoolId).order('issued_date', { ascending: false });
      const issuesData = await (issuesQuery as any);
      const issuesList = (issuesData.data || []) as any[];
      
      // Fetch book details for issues
      const bookIds = [...new Set(issuesList.map(i => i.book_id).filter(Boolean))];
      let issueBooks: any[] = [];
      if (bookIds.length > 0) {
        const booksForIssues = await (supabase.from('library_books').select('*').in('id', bookIds) as any);
        issueBooks = booksForIssues.data || [];
      }
      
      const processedIssues = issuesList.map(issue => ({
        ...issue,
        book: issueBooks.find((b: any) => b.id === issue.book_id),
      }));
      setIssues(processedIssues);

      // Fetch students
      const profilesQuery = await (supabase.from('profiles').select('user_id, full_name').eq('role', 'student') as any);
      const studentsQuery = await (supabase.from('students').select('id, user_id') as any);
      const profilesData = profilesQuery.data || [];
      const studentRecords = studentsQuery.data || [];

      const studentsList = profilesData.map((p: any) => {
        const studentRecord = studentRecords.find((s: any) => s.user_id === p.user_id);
        return {
          id: studentRecord?.id || p.user_id,
          full_name: p.full_name,
          user_id: p.user_id,
        };
      });
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching library data:', error);
      toast({ title: 'Error', description: 'Failed to load library data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBook = async () => {
    try {
      const { error } = await supabase.from('library_books').insert({
        ...bookForm,
        available_copies: bookForm.total_copies,
        school_id: schoolId,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Book added to library' });
      setBookDialogOpen(false);
      resetBookForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateBook = async () => {
    if (!editingBook) return;

    try {
      const copyDiff = bookForm.total_copies - editingBook.total_copies;
      const newAvailable = editingBook.available_copies + copyDiff;

      const { error } = await supabase
        .from('library_books')
        .update({
          ...bookForm,
          available_copies: Math.max(0, newAvailable),
        })
        .eq('id', editingBook.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Book updated successfully' });
      setBookDialogOpen(false);
      setEditingBook(null);
      resetBookForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteBook = async (book: Book) => {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('library_books').delete().eq('id', book.id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Book deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleIssueBook = async () => {
    if (!selectedBook || !issueForm.student_id) return;

    if (selectedBook.available_copies < 1) {
      toast({ title: 'Error', description: 'No copies available', variant: 'destructive' });
      return;
    }

    try {
      const today = new Date();
      const dueDate = addDays(today, issueForm.due_days);

      // Create issue record
      const { error: issueError } = await supabase.from('book_issues').insert({
        book_id: selectedBook.id,
        student_id: issueForm.student_id,
        issued_date: format(today, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'issued',
        issued_by: user?.id,
        school_id: schoolId,
      });

      if (issueError) throw issueError;

      // Update available copies
      const { error: updateError } = await supabase
        .from('library_books')
        .update({ available_copies: selectedBook.available_copies - 1 })
        .eq('id', selectedBook.id);

      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Book issued successfully' });
      setIssueDialogOpen(false);
      setSelectedBook(null);
      setIssueForm({ student_id: '', due_days: 14 });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleReturnBook = async (issue: BookIssue) => {
    try {
      const today = new Date();
      const dueDate = new Date(issue.due_date);
      const daysOverdue = Math.max(0, differenceInDays(today, dueDate));
      const fine = daysOverdue * FINE_PER_DAY;

      // Update issue record
      const { error: issueError } = await supabase
        .from('book_issues')
        .update({
          returned_date: format(today, 'yyyy-MM-dd'),
          status: 'returned',
          fine_amount: fine,
        })
        .eq('id', issue.id);

      if (issueError) throw issueError;

      // Update available copies
      const book = books.find(b => b.id === issue.book_id);
      if (book) {
        await supabase
          .from('library_books')
          .update({ available_copies: book.available_copies + 1 })
          .eq('id', book.id);
      }

      toast({ 
        title: 'Book Returned', 
        description: fine > 0 ? `Fine: ₦${fine.toLocaleString()}` : 'No fine due' 
      });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetBookForm = () => {
    setBookForm({
      isbn: '',
      title: '',
      author: '',
      publisher: '',
      category: 'Textbook',
      total_copies: 1,
      location: '',
    });
  };

  const openEditDialog = (book: Book) => {
    setEditingBook(book);
    setBookForm({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher || '',
      category: book.category,
      total_copies: book.total_copies,
      location: book.location || '',
    });
    setBookDialogOpen(true);
  };

  const openIssueDialog = (book: Book) => {
    setSelectedBook(book);
    setIssueDialogOpen(true);
  };

  // Filtered books
  const filteredBooks = books.filter(book => {
    const matchesSearch = 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.isbn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || book.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Statistics
  const stats = {
    totalBooks: books.reduce((sum, b) => sum + b.total_copies, 0),
    availableBooks: books.reduce((sum, b) => sum + b.available_copies, 0),
    issuedBooks: issues.filter(i => i.status === 'issued').length,
    overdueBooks: issues.filter(i => 
      i.status === 'issued' && new Date(i.due_date) < new Date()
    ).length,
  };

  // Active issues (not returned)
  const activeIssues = issues.filter(i => i.status === 'issued');

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
          <h2 className="text-2xl font-bold">Library Management</h2>
          <p className="text-muted-foreground">Manage books, issues, and returns</p>
        </div>
        <Button onClick={() => { resetBookForm(); setEditingBook(null); setBookDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalBooks}</p>
                <p className="text-sm text-muted-foreground">Total Books</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <BookCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.availableBooks}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.issuedBooks}</p>
                <p className="text-sm text-muted-foreground">Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdueBooks}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Book Catalog</TabsTrigger>
          <TabsTrigger value="issued">Issued Books ({activeIssues.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Books Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <p className="text-xs text-muted-foreground">{book.isbn}</p>
                        </div>
                      </TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{book.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={book.available_copies > 0 ? 'default' : 'destructive'}>
                          {book.available_copies}/{book.total_copies}
                        </Badge>
                      </TableCell>
                      <TableCell>{book.location || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openIssueDialog(book)}
                            disabled={book.available_copies < 1}
                          >
                            Issue
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(book)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteBook(book)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredBooks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No books found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issued">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeIssues.map((issue) => {
                    const isOverdue = new Date(issue.due_date) < new Date();
                    const daysOverdue = isOverdue ? differenceInDays(new Date(), new Date(issue.due_date)) : 0;
                    const student = students.find(s => s.id === issue.student_id);

                    return (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium">{issue.book?.title}</TableCell>
                        <TableCell>{student?.full_name || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(issue.issued_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(new Date(issue.due_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          {isOverdue ? (
                            <Badge variant="destructive">
                              Overdue ({daysOverdue} days) - ₦{(daysOverdue * FINE_PER_DAY).toLocaleString()}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleReturnBook(issue)}>
                            <BookCheck className="h-4 w-4 mr-2" />
                            Return
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {activeIssues.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No books currently issued
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Returned</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.slice(0, 50).map((issue) => {
                    const student = students.find(s => s.id === issue.student_id);
                    return (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium">{issue.book?.title}</TableCell>
                        <TableCell>{student?.full_name || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(issue.issued_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          {issue.returned_date 
                            ? format(new Date(issue.returned_date), 'MMM dd, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {issue.fine_amount > 0 ? `₦${issue.fine_amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={issue.status === 'returned' ? 'default' : 'secondary'}>
                            {issue.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Book Dialog */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ISBN</Label>
                <Input
                  value={bookForm.isbn}
                  onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                  placeholder="ISBN"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={bookForm.category} 
                  onValueChange={(v) => setBookForm({ ...bookForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                placeholder="Book title"
              />
            </div>
            <div className="space-y-2">
              <Label>Author *</Label>
              <Input
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                placeholder="Author name"
              />
            </div>
            <div className="space-y-2">
              <Label>Publisher</Label>
              <Input
                value={bookForm.publisher}
                onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                placeholder="Publisher"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Copies</Label>
                <Input
                  type="number"
                  min={1}
                  value={bookForm.total_copies}
                  onChange={(e) => setBookForm({ ...bookForm, total_copies: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={bookForm.location}
                  onChange={(e) => setBookForm({ ...bookForm, location: e.target.value })}
                  placeholder="e.g., Shelf A-3"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={editingBook ? handleUpdateBook : handleAddBook}
              disabled={!bookForm.title || !bookForm.author}
            >
              {editingBook ? 'Update' : 'Add'} Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Book Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Book</DialogTitle>
          </DialogHeader>
          {selectedBook && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedBook.title}</p>
                <p className="text-sm text-muted-foreground">by {selectedBook.author}</p>
                <Badge className="mt-2">
                  {selectedBook.available_copies} available
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Select Student *</Label>
                <Select 
                  value={issueForm.student_id} 
                  onValueChange={(v) => setIssueForm({ ...issueForm, student_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loan Period (days)</Label>
                <Select 
                  value={issueForm.due_days.toString()} 
                  onValueChange={(v) => setIssueForm({ ...issueForm, due_days: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="21">21 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Fine: ₦{FINE_PER_DAY} per day after due date
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleIssueBook} disabled={!issueForm.student_id}>
              Issue Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
