import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Printer, Search } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface Payment {
  id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  status: string;
  student?: {
    admission_number: string;
    profile?: {
      full_name: string;
    };
  };
  fee_structure?: {
    fee_type: string;
    academic_year: string;
  };
}

export const FeeReceiptGenerator = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const searchPayments = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a receipt number or admission number");
      return;
    }

    setIsLoading(true);

    // First, get school info
    const { data: school } = await supabase
      .from("schools")
      .select("*")
      .eq("id", undefined)
      .single();

    setSchoolInfo(school);

    // Search by receipt number
    let { data, error } = await supabase
      .from("fee_payments")
      .select(`
        *,
        student:students(
          admission_number,
          profile:profiles!students_user_id_fkey(full_name)
        ),
        fee_structure:fee_structures(fee_type, academic_year)
      `)
      
      .or(`receipt_number.ilike.%${searchQuery}%`);

    if (!error && data && data.length === 0) {
      // Search by admission number
      const { data: students } = await supabase
        .from("students")
        .select("id")
        
        .ilike("admission_number", `%${searchQuery}%`);

      if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);
        
        const { data: paymentData } = await supabase
          .from("fee_payments")
          .select(`
            *,
            student:students(
              admission_number,
              profile:profiles!students_user_id_fkey(full_name)
            ),
          fee_structure:fee_structures(fee_type, academic_year)
          `)
          
          .in("student_id", studentIds);

        data = paymentData;
      }
    }

    setPayments((data as any) || []);
    setIsLoading(false);
  };

  const generatePDF = async (payment: Payment) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(schoolInfo?.name || "School Name", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(schoolInfo?.address || "School Address", pageWidth / 2, 28, { align: "center" });
    doc.text(`Tel: ${schoolInfo?.phone || ""} | Email: ${schoolInfo?.email || ""}`, pageWidth / 2, 34, { align: "center" });
    
    // Receipt Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("FEE RECEIPT", pageWidth / 2, 50, { align: "center" });
    
    // Receipt border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(15, 55, pageWidth - 30, 100);
    
    // Receipt Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    const leftCol = 25;
    const rightCol = pageWidth / 2 + 10;
    let y = 65;
    const lineHeight = 8;
    
    doc.text("Receipt No:", leftCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(payment.receipt_number || "N/A", leftCol + 35, y);
    
    doc.setFont("helvetica", "normal");
    doc.text("Date:", rightCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(payment.payment_date ? format(new Date(payment.payment_date), "MMM dd, yyyy") : "N/A", rightCol + 20, y);
    
    y += lineHeight * 2;
    doc.setFont("helvetica", "normal");
    doc.text("Student Name:", leftCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(payment.student?.profile?.full_name || "N/A", leftCol + 40, y);
    
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    doc.text("Admission No:", leftCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(payment.student?.admission_number || "N/A", leftCol + 40, y);
    
    y += lineHeight * 2;
    doc.setFont("helvetica", "normal");
    doc.text("Fee Type:", leftCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(payment.fee_structure?.fee_type || "N/A", leftCol + 30, y);
    
    doc.setFont("helvetica", "normal");
    doc.text("Academic Year:", rightCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(payment.fee_structure?.academic_year || "N/A", rightCol + 45, y);
    
    y += lineHeight * 2;
    doc.setFont("helvetica", "normal");
    doc.text("Payment Method:", leftCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(payment.payment_method || "N/A", leftCol + 45, y);
    
    y += lineHeight * 2;
    doc.setFillColor(240, 240, 240);
    doc.rect(leftCol - 5, y - 5, pageWidth - 50, 15, "F");
    doc.setFontSize(14);
    doc.text("Amount Paid:", leftCol, y + 5);
    doc.setFont("helvetica", "bold");
    doc.text(`₦${payment.amount_paid.toLocaleString()}`, rightCol + 30, y + 5);
    
    // Footer
    y = 165;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("_______________________", leftCol, y);
    doc.text("Authorized Signature", leftCol + 5, y + 8);
    
    doc.text("_______________________", rightCol + 20, y);
    doc.text("School Stamp", rightCol + 35, y + 8);
    
    doc.setFontSize(8);
    doc.text("This is a computer generated receipt.", pageWidth / 2, 190, { align: "center" });
    
    return doc;
  };

  const handleDownload = async (payment: Payment) => {
    const doc = await generatePDF(payment);
    doc.save(`receipt-${payment.receipt_number || payment.id}.pdf`);
    toast.success("Receipt downloaded successfully");
  };

  const handlePrint = async (payment: Payment) => {
    const doc = await generatePDF(payment);
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  const handlePreview = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPreviewDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Fee Receipt Generator</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Search Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by receipt number or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPayments()}
                className="pl-10"
              />
            </div>
            <Button onClick={searchPayments} disabled={isLoading}>
              Search
            </Button>
          </div>

          {payments.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.receipt_number || "—"}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.student?.profile?.full_name || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.student?.admission_number}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{payment.fee_structure?.fee_type || "—"}</TableCell>
                    <TableCell>₦{payment.amount_paid.toLocaleString()}</TableCell>
                    <TableCell>
                      {payment.payment_date
                        ? format(new Date(payment.payment_date), "MMM dd, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{payment.payment_method || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(payment)}
                          title="Preview"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(payment)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(payment)}
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {payments.length === 0 && searchQuery && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No payments found matching your search
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div ref={receiptRef} className="p-6 border rounded-lg bg-white">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">{schoolInfo?.name || "School Name"}</h2>
                <p className="text-sm text-muted-foreground">{schoolInfo?.address || "School Address"}</p>
                <p className="text-sm text-muted-foreground">
                  Tel: {schoolInfo?.phone || ""} | Email: {schoolInfo?.email || ""}
                </p>
              </div>

              <h3 className="text-lg font-bold text-center mb-4 border-y py-2">FEE RECEIPT</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Receipt No</p>
                  <p className="font-medium">{selectedPayment.receipt_number || "N/A"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {selectedPayment.payment_date
                      ? format(new Date(selectedPayment.payment_date), "MMM dd, yyyy")
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student Name:</span>
                  <span className="font-medium">{selectedPayment.student?.profile?.full_name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admission No:</span>
                  <span className="font-medium">{selectedPayment.student?.admission_number || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee Type:</span>
                  <span className="font-medium">{selectedPayment.fee_structure?.fee_type || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Academic Year:</span>
                  <span className="font-medium">{selectedPayment.fee_structure?.academic_year || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium capitalize">{selectedPayment.payment_method || "N/A"}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg mb-6">
                <span className="text-lg font-medium">Amount Paid:</span>
                <span className="text-2xl font-bold">₦{selectedPayment.amount_paid.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8">
                <div className="text-center">
                  <div className="border-t border-dashed pt-2">
                    <p className="text-sm text-muted-foreground">Authorized Signature</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-dashed pt-2">
                    <p className="text-sm text-muted-foreground">School Stamp</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-6">
                This is a computer generated receipt.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            {selectedPayment && (
              <>
                <Button variant="outline" onClick={() => handlePrint(selectedPayment)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button onClick={() => handleDownload(selectedPayment)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
