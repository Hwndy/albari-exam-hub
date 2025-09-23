import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreditCard, Plus, Search, Filter, FileDown, Receipt, AlertTriangle, CheckCircle, Clock, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FeeStructure {
  id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  academic_year: string;
  class_id: string;
  is_mandatory: boolean;
  classes?: {
    name: string;
  };
}

interface FeePayment {
  id: string;
  student_id: string;
  fee_structure_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  status: string;
  receipt_number: string;
  transaction_id: string;
  students?: {
    admission_number: string;
    profiles?: {
      full_name: string;
    };
  };
  fee_structures?: {
    fee_type: string;
    amount: number;
  };
}

interface Class {
  id: string;
  name: string;
}

export const FeeManagement = () => {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddFeeStructure, setShowAddFeeStructure] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2024/2025');

  const [newFeeStructure, setNewFeeStructure] = useState({
    fee_type: '',
    amount: '',
    due_date: undefined as Date | undefined,
    academic_year: '2024/2025',
    class_id: '',
    is_mandatory: true
  });

  const [newPayment, setNewPayment] = useState({
    student_admission: '',
    fee_structure_id: '',
    amount_paid: '',
    payment_date: undefined as Date | undefined,
    payment_method: '',
    transaction_id: '',
    receipt_number: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch fee structures
      const { data: feeStructuresData, error: feeStructuresError } = await supabase
        .from('fee_structures')
        .select(`
          *,
          classes (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (feeStructuresError) throw feeStructuresError;

      // Fetch fee payments with student details
      const { data: feePaymentsData, error: feePaymentsError } = await supabase
        .from('fee_payments')
        .select(`
          *,
          fee_structures (
            fee_type,
            amount
          )
        `)
        .order('created_at', { ascending: false });

      if (feePaymentsError) throw feePaymentsError;

      // Fetch students separately and merge
      const paymentsWithStudents = await Promise.all(
        (feePaymentsData || []).map(async (payment) => {
          const { data: student } = await supabase
            .from('students')
            .select('admission_number, user_id')
            .eq('id', payment.student_id)
            .single();

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', student?.user_id)
            .single();

          return {
            ...payment,
            students: {
              admission_number: student?.admission_number || '',
              profiles: profile
            }
          };
        })
      );

      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (classesError) throw classesError;

      setFeeStructures(feeStructuresData || []);
      setFeePayments(paymentsWithStudents);
      setClasses(classesData || []);
    } catch (error) {
      console.error('Error fetching fee data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load fee data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFeeStructure = async () => {
    try {
      if (!newFeeStructure.fee_type || !newFeeStructure.amount || !newFeeStructure.class_id) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('fee_structures')
        .insert({
          fee_type: newFeeStructure.fee_type,
          amount: parseFloat(newFeeStructure.amount),
          due_date: newFeeStructure.due_date ? format(newFeeStructure.due_date, 'yyyy-MM-dd') : null,
          academic_year: newFeeStructure.academic_year,
          class_id: newFeeStructure.class_id,
          is_mandatory: newFeeStructure.is_mandatory
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Fee structure created successfully',
      });

      setShowAddFeeStructure(false);
      setNewFeeStructure({
        fee_type: '',
        amount: '',
        due_date: undefined,
        academic_year: '2024/2025',
        class_id: '',
        is_mandatory: true
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error creating fee structure:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create fee structure',
        variant: 'destructive',
      });
    }
  };

  const handleRecordPayment = async () => {
    try {
      if (!newPayment.student_admission || !newPayment.fee_structure_id || !newPayment.amount_paid) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      // Find student by admission number
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('admission_number', newPayment.student_admission)
        .single();

      if (studentError || !student) {
        toast({
          title: 'Error',
          description: 'Student not found with this admission number',
          variant: 'destructive',
        });
        return;
      }

      // Generate receipt number if not provided
      const receiptNumber = newPayment.receipt_number || `RCP${Date.now()}`;

      const { error } = await supabase
        .from('fee_payments')
        .insert({
          student_id: student.id,
          fee_structure_id: newPayment.fee_structure_id,
          amount_paid: parseFloat(newPayment.amount_paid),
          payment_date: newPayment.payment_date ? format(newPayment.payment_date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          payment_method: newPayment.payment_method,
          transaction_id: newPayment.transaction_id,
          receipt_number: receiptNumber,
          status: 'completed'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      setShowRecordPayment(false);
      setNewPayment({
        student_admission: '',
        fee_structure_id: '',
        amount_paid: '',
        payment_date: undefined,
        payment_method: '',
        transaction_id: '',
        receipt_number: ''
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    }
  };

  const filteredFeeStructures = feeStructures.filter(fee => {
    const matchesSearch = fee.fee_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || fee.class_id === selectedClass;
    const matchesYear = fee.academic_year === selectedAcademicYear;
    
    return matchesSearch && matchesClass && matchesYear;
  });

  const totalCollected = feePayments.reduce((sum, payment) => sum + payment.amount_paid, 0);
  const totalPending = feeStructures.reduce((sum, fee) => sum + fee.amount, 0) - totalCollected;

  const feeTypes = [
    'Tuition Fee',
    'Admission Fee',
    'Examination Fee',
    'Development Levy',
    'Sports Fee',
    'Library Fee',
    'Laboratory Fee',
    'Uniform Fee',
    'Transportation Fee',
    'Feeding Fee'
  ];

  const paymentMethods = [
    'Cash',
    'Bank Transfer',
    'POS',
    'Online Payment',
    'Cheque',
    'Mobile Money'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Fee Management</h2>
          <p className="text-muted-foreground">Manage fee structures, payments, and financial records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRecordPayment(true)}>
            <Receipt className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
          <Button onClick={() => setShowAddFeeStructure(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fee Structure
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">₦{totalCollected.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">₦{totalPending.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  ₦{feePayments
                    .filter(p => new Date(p.payment_date).getMonth() === new Date().getMonth())
                    .reduce((sum, p) => sum + p.amount_paid, 0)
                    .toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fee Structures</p>
                <p className="text-2xl font-bold">{feeStructures.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="structures" className="space-y-6">
        <TabsList>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="structures" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search fee types..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024/2025">2024/2025</SelectItem>
                    <SelectItem value="2023/2024">2023/2024</SelectItem>
                    <SelectItem value="2022/2023">2022/2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Fee Structures Table */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Structures ({filteredFeeStructures.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeeStructures.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.fee_type}</TableCell>
                        <TableCell>{fee.classes?.name || 'N/A'}</TableCell>
                        <TableCell>₦{fee.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {fee.due_date ? format(new Date(fee.due_date), 'MMM dd, yyyy') : 'No Due Date'}
                        </TableCell>
                        <TableCell>{fee.academic_year}</TableCell>
                        <TableCell>
                          <Badge variant={fee.is_mandatory ? 'default' : 'secondary'}>
                            {fee.is_mandatory ? 'Mandatory' : 'Optional'}
                          </Badge>
                        </TableCell>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feePayments.slice(0, 10).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.students?.profiles?.full_name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{payment.students?.admission_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>{payment.fee_structures?.fee_type}</TableCell>
                        <TableCell>₦{payment.amount_paid.toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.receipt_number}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Financial reports and analytics will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Fee Structure Dialog */}
      <Dialog open={showAddFeeStructure} onOpenChange={setShowAddFeeStructure}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fee Structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fee_type">Fee Type *</Label>
              <Select value={newFeeStructure.fee_type} onValueChange={(value) => setNewFeeStructure(prev => ({ ...prev, fee_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  {feeTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦) *</Label>
              <Input
                id="amount"
                type="number"
                value={newFeeStructure.amount}
                onChange={(e) => setNewFeeStructure(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select value={newFeeStructure.class_id} onValueChange={(value) => setNewFeeStructure(prev => ({ ...prev, class_id: value }))}>
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
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newFeeStructure.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newFeeStructure.due_date ? format(newFeeStructure.due_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newFeeStructure.due_date}
                    onSelect={(date) => setNewFeeStructure(prev => ({ ...prev, due_date: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Select value={newFeeStructure.academic_year} onValueChange={(value) => setNewFeeStructure(prev => ({ ...prev, academic_year: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2023/2024">2023/2024</SelectItem>
                  <SelectItem value="2022/2023">2022/2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddFeeStructure(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFeeStructure}>
              Add Fee Structure
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student_admission">Student Admission Number *</Label>
              <Input
                id="student_admission"
                value={newPayment.student_admission}
                onChange={(e) => setNewPayment(prev => ({ ...prev, student_admission: e.target.value }))}
                placeholder="Enter admission number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee_structure">Fee Structure *</Label>
              <Select value={newPayment.fee_structure_id} onValueChange={(value) => setNewPayment(prev => ({ ...prev, fee_structure_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee structure" />
                </SelectTrigger>
                <SelectContent>
                  {feeStructures.map((fee) => (
                    <SelectItem key={fee.id} value={fee.id}>
                      {fee.fee_type} - {fee.classes?.name} (₦{fee.amount.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid (₦) *</Label>
              <Input
                id="amount_paid"
                type="number"
                value={newPayment.amount_paid}
                onChange={(e) => setNewPayment(prev => ({ ...prev, amount_paid: e.target.value }))}
                placeholder="Enter amount paid"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={newPayment.payment_method} onValueChange={(value) => setNewPayment(prev => ({ ...prev, payment_method: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction_id">Transaction ID</Label>
              <Input
                id="transaction_id"
                value={newPayment.transaction_id}
                onChange={(e) => setNewPayment(prev => ({ ...prev, transaction_id: e.target.value }))}
                placeholder="Enter transaction ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newPayment.payment_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newPayment.payment_date ? format(newPayment.payment_date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newPayment.payment_date}
                    onSelect={(date) => setNewPayment(prev => ({ ...prev, payment_date: date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowRecordPayment(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment}>
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};