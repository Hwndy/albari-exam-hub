import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Search, Loader2, Clock, BookCheck, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

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

interface MyIssue {
  id: string;
  book_id: string;
  issued_date: string;
  due_date: string;
  returned_date: string | null;
  fine_amount: number;
  status: string;
  book?: Book;
}

const CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History',
  'Literature', 'Geography', 'Religious Studies', 'Arts', 'Technology',
  'Reference', 'Biography', 'Children', 'Textbook', 'Other'
];

export const LibraryCatalog: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [myIssues, setMyIssues] = useState<MyIssue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentId();
  }, [user]);

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  const fetchStudentId = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setStudentId(data.id);
    } else {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    if (!studentId) return;

    setIsLoading(true);
    try {
      const [booksRes, issuesRes] = await Promise.all([
        supabase.from('library_books').select('*').order('title'),
        supabase
          .from('book_issues')
          .select('*, library_books(*)')
          .eq('student_id', studentId)
          .order('issued_date', { ascending: false }),
      ]);

      setBooks(booksRes.data || []);
      
      const processedIssues = (issuesRes.data || []).map((issue: any) => ({
        ...issue,
        book: issue.library_books,
      }));
      setMyIssues(processedIssues);
    } catch (error) {
      console.error('Error fetching library data:', error);
      toast({ title: 'Error', description: 'Failed to load library data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
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

  // Current books (not returned)
  const currentBooks = myIssues.filter(i => i.status === 'issued');
  const overdueBooks = currentBooks.filter(i => new Date(i.due_date) < new Date());

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
      <div>
        <h2 className="text-2xl font-bold">Library</h2>
        <p className="text-muted-foreground">Browse books and view your borrowed items</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{books.length}</p>
                <p className="text-sm text-muted-foreground">Books Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookCheck className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{currentBooks.length}</p>
                <p className="text-sm text-muted-foreground">My Borrowed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{myIssues.filter(i => i.status === 'returned').length}</p>
                <p className="text-sm text-muted-foreground">Returned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{overdueBooks.length}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Browse Catalog</TabsTrigger>
          <TabsTrigger value="borrowed">My Books ({currentBooks.length})</TabsTrigger>
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

          {/* Books Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => (
              <Card key={book.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                    <Badge variant={book.available_copies > 0 ? 'default' : 'destructive'}>
                      {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">by {book.author}</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline">{book.category}</Badge>
                    <span className="text-muted-foreground">
                      {book.available_copies}/{book.total_copies} copies
                    </span>
                  </div>
                  {book.location && (
                    <p className="text-xs text-muted-foreground mt-2">
                      📍 {book.location}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredBooks.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No books found matching your search.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="borrowed">
          {currentBooks.length > 0 ? (
            <div className="space-y-4">
              {currentBooks.map((issue) => {
                const isOverdue = new Date(issue.due_date) < new Date();
                const daysLeft = differenceInDays(new Date(issue.due_date), new Date());
                const daysOverdue = isOverdue ? Math.abs(daysLeft) : 0;

                return (
                  <Card key={issue.id} className={isOverdue ? 'border-destructive' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{issue.book?.title}</h3>
                          <p className="text-muted-foreground">by {issue.book?.author}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Borrowed: {format(new Date(issue.issued_date), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm">
                            Due: <strong>{format(new Date(issue.due_date), 'MMM dd, yyyy')}</strong>
                          </p>
                          {isOverdue ? (
                            <Badge variant="destructive" className="mt-2">
                              Overdue by {daysOverdue} days
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="mt-2">
                              {daysLeft} days remaining
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>You haven't borrowed any books yet.</p>
                <p className="text-sm mt-2">Visit the library to borrow books!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          {myIssues.length > 0 ? (
            <div className="space-y-3">
              {myIssues.map((issue) => (
                <Card key={issue.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-medium">{issue.book?.title}</h3>
                        <p className="text-sm text-muted-foreground">by {issue.book?.author}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          {format(new Date(issue.issued_date), 'MMM dd')} - {' '}
                          {issue.returned_date 
                            ? format(new Date(issue.returned_date), 'MMM dd, yyyy')
                            : 'Not returned'
                          }
                        </span>
                        <Badge variant={issue.status === 'returned' ? 'default' : 'secondary'}>
                          {issue.status}
                        </Badge>
                        {issue.fine_amount > 0 && (
                          <Badge variant="destructive">
                            Fine: ₦{issue.fine_amount.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No borrowing history yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
