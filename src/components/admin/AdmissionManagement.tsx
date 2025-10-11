import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, FileText, Calendar, User, Mail, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { InterviewScheduler } from '@/components/admin/InterviewScheduler';

type AdmissionStatus = 'submitted' | 'under_review' | 'interview_scheduled' | 'accepted' | 'rejected' | 'payment_pending' | 'enrolled' | 'withdrawn';

interface Application {
  id: string;
  application_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  status: AdmissionStatus;
  application_date: string;
  applying_for_class_id: string | null;
  parent_guardian_info: any;
  address: any;
}

export const AdmissionManagement = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      let query = supabase
        .from('admission_applications')
        .select('*')
        .order('application_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as AdmissionStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications((data || []) as Application[]);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: AdmissionStatus) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('admission_applications')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Send notification email
      try {
        await supabase.functions.invoke('send-admission-notification', {
          body: {
            application_id: applicationId,
            notification_type: newStatus,
          },
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't fail the status update if notification fails
      }

      toast({
        title: 'Status Updated',
        description: `Application ${newStatus} successfully. Notification sent to applicant.`,
      });

      fetchApplications();
      setSelectedApplication(null);
      setReviewNotes('');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update application status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const enrollStudent = async (application: Application) => {
    setActionLoading(true);
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: application.email,
        password: Math.random().toString(36).slice(-12),
        email_confirm: true,
        user_metadata: {
          full_name: `${application.first_name} ${application.last_name}`,
          role: 'student'
        }
      });

      if (authError) throw authError;

      // Create profile
      await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: `${application.first_name} ${application.middle_name || ''} ${application.last_name}`.trim(),
        role: 'student'
      });

      // Add role
      await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'student'
      });

      // Create student record
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: authData.user.id,
          admission_number: application.application_number,
          date_of_birth: application.date_of_birth,
          gender: application.gender,
          address: application.address,
          status: 'active'
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Update application
      await supabase
        .from('admission_applications')
        .update({
          status: 'enrolled',
          student_id: studentData.id,
          admission_date: new Date().toISOString()
        })
        .eq('id', application.id);

      // Send enrollment notification
      try {
        await supabase.functions.invoke('send-admission-notification', {
          body: {
            application_id: application.id,
            notification_type: 'enrolled',
            additional_data: {
              admission_number: application.application_number,
            },
          },
        });
      } catch (notifError) {
        console.error('Error sending enrollment notification:', notifError);
      }

      toast({
        title: 'Student Enrolled',
        description: 'Student account created and welcome email sent successfully',
      });

      fetchApplications();
      setSelectedApplication(null);
    } catch (error: any) {
      console.error('Error enrolling student:', error);
      toast({
        title: 'Error',
        description: 'Failed to enroll student',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: AdmissionStatus) => {
    switch (status) {
      case 'submitted':
        return 'secondary';
      case 'under_review':
        return 'default';
      case 'interview_scheduled':
        return 'outline';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'enrolled':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: AdmissionStatus) => {
    switch (status) {
      case 'accepted':
      case 'enrolled':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const statusCounts = {
    all: applications.length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    interview_scheduled: applications.filter(a => a.status === 'interview_scheduled').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    enrolled: applications.filter(a => a.status === 'enrolled').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admission Management</h2>
        <p className="text-muted-foreground">
          Review and manage student admission applications
        </p>
      </div>

      {/* Status Filter */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="submitted">New ({statusCounts.submitted})</TabsTrigger>
          <TabsTrigger value="under_review">Review ({statusCounts.under_review})</TabsTrigger>
          <TabsTrigger value="interview_scheduled">Interview ({statusCounts.interview_scheduled})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({statusCounts.accepted})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({statusCounts.rejected})</TabsTrigger>
          <TabsTrigger value="enrolled">Enrolled ({statusCounts.enrolled})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Applications List */}
      <div className="grid gap-4">
        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No applications found</p>
            </CardContent>
          </Card>
        ) : (
          applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {application.first_name} {application.middle_name} {application.last_name}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(application.status)} className="flex items-center gap-1">
                        {getStatusIcon(application.status)}
                        {application.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{application.application_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{application.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{application.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Applied: {format(new Date(application.application_date), 'PP')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Age: {new Date().getFullYear() - new Date(application.date_of_birth).getFullYear()} years</span>
                      </div>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedApplication(application)}
                      >
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Application Details</DialogTitle>
                        <DialogDescription>
                          {application.application_number}
                        </DialogDescription>
                      </DialogHeader>

                      {selectedApplication && (
                        <div className="space-y-6">
                          {/* Personal Information */}
                          <div>
                            <h4 className="font-semibold mb-3">Personal Information</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Full Name:</span>
                                <p className="font-medium">
                                  {selectedApplication.first_name} {selectedApplication.middle_name} {selectedApplication.last_name}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Date of Birth:</span>
                                <p className="font-medium">{format(new Date(selectedApplication.date_of_birth), 'PP')}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Gender:</span>
                                <p className="font-medium">{selectedApplication.gender}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Status:</span>
                                <p className="font-medium capitalize">{selectedApplication.status.replace('_', ' ')}</p>
                              </div>
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div>
                            <h4 className="font-semibold mb-3">Contact Information</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Email:</span>
                                <p className="font-medium">{selectedApplication.email}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Phone:</span>
                                <p className="font-medium">{selectedApplication.phone}</p>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Address:</span>
                                <p className="font-medium">
                                  {selectedApplication.address?.street}, {selectedApplication.address?.city}, {selectedApplication.address?.state}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Parent/Guardian Information */}
                          <div>
                            <h4 className="font-semibold mb-3">Parent/Guardian Information</h4>
                            <div className="space-y-3 text-sm">
                              {selectedApplication.parent_guardian_info?.father?.name && (
                                <div>
                                  <span className="text-muted-foreground">Father:</span>
                                  <p className="font-medium">
                                    {selectedApplication.parent_guardian_info.father.name} - {selectedApplication.parent_guardian_info.father.phone}
                                  </p>
                                </div>
                              )}
                              {selectedApplication.parent_guardian_info?.mother?.name && (
                                <div>
                                  <span className="text-muted-foreground">Mother:</span>
                                  <p className="font-medium">
                                    {selectedApplication.parent_guardian_info.mother.name} - {selectedApplication.parent_guardian_info.mother.phone}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Review Notes */}
                          <div className="space-y-2">
                            <Label htmlFor="review_notes">Review Notes</Label>
                            <Textarea
                              id="review_notes"
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder="Add notes about this application..."
                              rows={4}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 justify-end">
                            {selectedApplication.status === 'submitted' && (
                              <>
                                <Button
                                  variant="outline"
                                  onClick={() => updateApplicationStatus(selectedApplication.id, 'under_review')}
                                  disabled={actionLoading}
                                >
                                  Mark Under Review
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => updateApplicationStatus(selectedApplication.id, 'rejected')}
                                  disabled={actionLoading}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {selectedApplication.status === 'under_review' && (
                              <>
                                <InterviewScheduler
                                  applicationId={selectedApplication.id}
                                  onScheduled={fetchApplications}
                                  trigger={
                                    <Button variant="outline" disabled={actionLoading}>
                                      Schedule Interview
                                    </Button>
                                  }
                                />
                                <Button
                                  onClick={() => updateApplicationStatus(selectedApplication.id, 'accepted')}
                                  disabled={actionLoading}
                                >
                                  Accept
                                </Button>
                              </>
                            )}
                            {selectedApplication.status === 'accepted' && (
                              <Button
                                onClick={() => enrollStudent(selectedApplication)}
                                disabled={actionLoading}
                              >
                                Enroll Student
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};