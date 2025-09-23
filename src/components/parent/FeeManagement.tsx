import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Clock, CheckCircle, AlertTriangle, CreditCard, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeePayment {
  id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  transaction_id: string;
  receipt_number: string;
  status: string;
  fee_structures: {
    fee_type: string;
    amount: number;
    due_date: string;
    academic_year: string;
  };
  students: {
    profiles: {
      full_name: string;
    };
  };
}

interface OutstandingFee {
  id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  academic_year: string;
  is_mandatory: boolean;
  class_id: string;
  classes: {
    name: string;
  };
}

export const FeeManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [outstandingFees, setOutstandingFees] = useState<OutstandingFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeeData();
  }, [user?.id]);

  const fetchFeeData = async () => {
    if (!user?.id) return;

    try {
      // First get parent record
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

      // Get student IDs for this parent
      const { data: relationshipData, error: relationshipError } = await supabase
        .from('student_parent_relationships')
        .select('student_id')
        .eq('parent_id', parentData.id);

      if (relationshipError) {
        console.error('Error fetching relationships:', relationshipError);
        return;
      }

      const studentIds = relationshipData?.map(rel => rel.student_id) || [];

      if (studentIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch fee payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('fee_payments')
        .select(`
          id,
          amount_paid,
          payment_date,
          payment_method,
          transaction_id,
          receipt_number,
          status,
          fee_structures (
            fee_type,
            amount,
            due_date,
            academic_year
          ),
          students (
            profiles (
              full_name
            )
          )
        `)
        .in('student_id', studentIds)
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        toast({
          title: 'Error',
          description: 'Failed to load payment records',
          variant: 'destructive',
        });
        return;
      }

      // Get class IDs for students
      const { data: classData, error: classError } = await supabase
        .from('class_assignments')
        .select('class_id, student_id')
        .in('student_id', studentIds);

      if (classError) {
        console.error('Error fetching class assignments:', classError);
        return;
      }

      const classIds = [...new Set(classData?.map(c => c.class_id) || [])];

      // Fetch outstanding fee structures
      const { data: feeStructuresData, error: feeStructuresError } = await supabase
        .from('fee_structures')
        .select(`
          id,
          fee_type,
          amount,
          due_date,
          academic_year,
          is_mandatory,
          class_id,
          classes (
            name
          )
        `)
        .in('class_id', classIds)
        .gte('due_date', new Date().toISOString().split('T')[0]);

      if (feeStructuresError) {
        console.error('Error fetching fee structures:', feeStructuresError);
        return;
      }

      // Filter out already paid fees
      const paidFeeStructureIds = new Set(
        paymentsData?.map(p => p.fee_structures?.id).filter(Boolean) || []
      );

      const unpaidFees = feeStructuresData?.filter(
        fee => !paidFeeStructureIds.has(fee.id)
      ) || [];

      setPayments(paymentsData || []);
      setOutstandingFees(unpaidFees);
    } catch (error) {
      console.error('Error in fetchFeeData:', error);
      toast({
        title: 'Error',
        description: 'Failed to load fee information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalOutstanding = () => {
    return outstandingFees.reduce((sum, fee) => sum + fee.amount, 0);
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'refunded':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handlePayNow = (feeId: string) => {
    toast({
      title: 'Payment Integration',
      description: 'Payment gateway integration will be implemented here.',
    });
  };

  const downloadReceipt = (receiptNumber: string) => {
    toast({
      title: 'Download Receipt',
      description: `Receipt ${receiptNumber} download will be implemented here.`,
    });
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

  const totalOutstanding = calculateTotalOutstanding();
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount_paid, 0);

  return (
    <div className="space-y-6">
      {/* Fee Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Fees</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalOutstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {outstandingFees.length} pending payment{outstandingFees.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalPaid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.length} payment{payments.length !== 1 ? 's' : ''} made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Due Date</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outstandingFees.length > 0 
                ? new Date(Math.min(...outstandingFees.map(f => new Date(f.due_date).getTime()))).toLocaleDateString()
                : 'None'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Upcoming payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Fees */}
      {outstandingFees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Outstanding Fees
            </CardTitle>
            <CardDescription>
              Fees that require payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {outstandingFees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{fee.fee_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {fee.classes?.name} • Academic Year: {fee.academic_year}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Due: {new Date(fee.due_date).toLocaleDateString()}
                    </div>
                    {fee.is_mandatory && (
                      <Badge variant="destructive" className="text-xs">
                        Mandatory
                      </Badge>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-lg font-bold">
                      ${fee.amount.toFixed(2)}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handlePayNow(fee.id)}
                      className="w-full"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Previous fee payments and receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No payment history found
            </p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{payment.fee_structures?.fee_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {payment.students?.profiles?.full_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Paid: {new Date(payment.payment_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Method: {payment.payment_method} • Receipt: {payment.receipt_number}
                    </div>
                    {payment.transaction_id && (
                      <div className="text-xs text-muted-foreground">
                        Transaction: {payment.transaction_id}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-lg font-bold text-green-600">
                      ${payment.amount_paid.toFixed(2)}
                    </div>
                    <Badge variant={getPaymentStatusBadgeVariant(payment.status)}>
                      {payment.status}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadReceipt(payment.receipt_number)}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};