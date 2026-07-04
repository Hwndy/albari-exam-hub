import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Receipt, Calendar, AlertCircle, Download, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FeeStructure {
  id: string;
  fee_type: string;
  academic_year: string;
  amount: number;
  due_date: string | null;
  is_mandatory: boolean;
  class_id: string | null;
  classes?: {
    name: string;
  };
}

interface FeePayment {
  id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string | null;
  transaction_id: string | null;
  receipt_number: string | null;
  status: string;
  fee_structures?: {
    fee_type: string;
    amount: number;
  };
}

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
}

export const FeeManagementEnhanced = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      // Get parent record
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (parentError) {
        console.error('Parent not found:', parentError);
        setLoading(false);
        return;
      }

      // Get students
      const { data: relationshipData } = await supabase
        .from('student_parent_relationships')
        .select(`
          students:student_id (
            id,
            user_id,
            admission_number
          )
        `)
        .eq('parent_id', parentData.id);

      const studentsData = relationshipData
        ?.map(rel => rel.students)
        .filter(Boolean) || [];

      // Get profile names
      if (studentsData.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentsData.map((s: any) => s.user_id));

        const studentsWithNames = studentsData.map((student: any) => {
          const profile = profilesData?.find(p => p.user_id === student.user_id);
          return {
            ...student,
            full_name: profile?.full_name || 'Unknown Student'
          };
        });

        setStudents(studentsWithNames as Student[]);

        // Get class IDs with school filter
        const { data: classAssignments } = await 
          supabase
            .from('class_assignments')
            .select('class_id')
            .in('student_id', studentsData.map((s: any) => s.id))
        ;

        const classIds = classAssignments?.map(ca => ca.class_id) || [];

        // Fetch fee structures with school filter
        const { data: feesData } = await 
          supabase
            .from('fee_structures')
            .select(`
              *,
              classes (name)
            `)
            .or(`class_id.in.(${classIds.join(',')}),class_id.is.null`)
        ;

        setFeeStructures(feesData || []);

        // Fetch payments with school filter
        const { data: paymentsData } = await 
          supabase
            .from('fee_payments')
            .select(`
              *,
              fee_structures (
                fee_type,
                amount
              )
            `)
            .in('student_id', studentsData.map((s: any) => s.id))
            .order('payment_date', { ascending: false })
        ;

        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error('Error fetching fee data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load fee information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalFees = () => {
    return feeStructures
      .filter(f => f.is_mandatory)
      .reduce((sum, fee) => sum + Number(fee.amount), 0);
  };

  const calculateTotalPaid = () => {
    return payments
      .filter(p => p.status === 'completed')
      .reduce((sum, payment) => sum + Number(payment.amount_paid), 0);
  };

  const calculateOutstanding = () => {
    return calculateTotalFees() - calculateTotalPaid();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalFees = calculateTotalFees();
  const totalPaid = calculateTotalPaid();
  const outstanding = calculateOutstanding();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{totalFees.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              For current academic year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₦{totalPaid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.length} payment(s) made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₦{outstanding.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {outstanding > 0 ? 'Payment required' : 'All paid up'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Structure</CardTitle>
          <CardDescription>
            Breakdown of fees for the current academic year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feeStructures.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No fee structure found
              </p>
            ) : (
              feeStructures.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{fee.fee_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {fee.classes?.name || 'All Classes'} • {fee.academic_year}
                    </div>
                    {fee.due_date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {format(new Date(fee.due_date), 'PP')}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-lg font-bold">
                      ₦{Number(fee.amount).toLocaleString()}
                    </div>
                    <Badge variant={fee.is_mandatory ? 'default' : 'secondary'}>
                      {fee.is_mandatory ? 'Mandatory' : 'Optional'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          {outstanding > 0 && (
            <div className="mt-6 flex justify-end">
              <Button 
                className="flex items-center gap-2"
                onClick={() => {
                  toast({
                    title: 'Payment Portal',
                    description: 'Payment integration coming soon. Please contact school administration for payment options.',
                  });
                }}
              >
                <CreditCard className="h-4 w-4" />
                Make Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Record of all fee payments made
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payment history found
              </p>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {payment.fee_structures?.fee_type || 'Fee Payment'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(payment.payment_date), 'PPP')}
                      {payment.payment_method && ` • ${payment.payment_method}`}
                    </div>
                    {payment.receipt_number && (
                      <div className="text-xs text-muted-foreground">
                        Receipt: {payment.receipt_number}
                      </div>
                    )}
                    {payment.transaction_id && (
                      <div className="text-xs text-muted-foreground">
                        Transaction ID: {payment.transaction_id}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-lg font-bold text-green-600">
                      ₦{Number(payment.amount_paid).toLocaleString()}
                    </div>
                    <Badge variant={getStatusBadgeVariant(payment.status)}>
                      {payment.status}
                    </Badge>
                    <Button variant="ghost" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Receipt
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};