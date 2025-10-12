import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Calendar, DollarSign, Users, CheckCircle, Clock, XCircle } from "lucide-react";

interface AdmissionSession {
  id: string;
  academic_year: string;
  session_name: string;
  start_date: string;
  end_date: string;
  status: string;
  application_fee: number;
  classes_open: any;
  required_documents: any;
  max_applicants: number | null;
  created_at: string;
}

export const AdmissionSessionManager = () => {
  const [sessions, setSessions] = useState<AdmissionSession[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    academic_year: "",
    session_name: "",
    start_date: "",
    end_date: "",
    status: "upcoming",
    application_fee: "",
    max_applicants: "",
    classes_open: [] as string[],
    required_documents: ["Birth Certificate", "Previous Result", "Passport Photo"],
  });

  useEffect(() => {
    fetchSessions();
    fetchClasses();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("admission_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      toast.error("Failed to load sessions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("name");
    setClasses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("admission_sessions").insert({
        ...formData,
        application_fee: parseFloat(formData.application_fee),
        max_applicants: formData.max_applicants ? parseInt(formData.max_applicants) : null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Admission session created successfully");
      setIsOpen(false);
      fetchSessions();
      resetForm();
    } catch (error: any) {
      toast.error("Failed to create session: " + error.message);
    }
  };

  const updateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("admission_sessions")
        .update({ status })
        .eq("id", sessionId);

      if (error) throw error;

      toast.success(`Session ${status} successfully`);
      fetchSessions();
    } catch (error: any) {
      toast.error("Failed to update session: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      academic_year: "",
      session_name: "",
      start_date: "",
      end_date: "",
      status: "upcoming",
      application_fee: "",
      max_applicants: "",
      classes_open: [],
      required_documents: ["Birth Certificate", "Previous Result", "Passport Photo"],
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; variant: "default" | "secondary" | "destructive" }> = {
      active: { icon: CheckCircle, variant: "default" },
      upcoming: { icon: Clock, variant: "secondary" },
      closed: { icon: XCircle, variant: "destructive" },
    };

    const { icon: Icon, variant } = variants[status];
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading sessions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admission Sessions</h2>
          <p className="text-muted-foreground">Manage admission periods and configurations</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Admission Session</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year</Label>
                  <Input
                    id="academic_year"
                    placeholder="e.g., 2025/2026"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session_name">Session Name</Label>
                  <Input
                    id="session_name"
                    placeholder="e.g., First Term Admission"
                    value={formData.session_name}
                    onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="application_fee">Application Fee (₦)</Label>
                  <Input
                    id="application_fee"
                    type="number"
                    placeholder="5000"
                    value={formData.application_fee}
                    onChange={(e) => setFormData({ ...formData, application_fee: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_applicants">Max Applicants (Optional)</Label>
                  <Input
                    id="max_applicants"
                    type="number"
                    placeholder="100"
                    value={formData.max_applicants}
                    onChange={(e) => setFormData({ ...formData, max_applicants: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Session</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>{session.session_name}</CardTitle>
                  <CardDescription>{session.academic_year}</CardDescription>
                </div>
                {getStatusBadge(session.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(session.start_date).toLocaleDateString()} -{" "}
                    {new Date(session.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>₦{Number(session.application_fee).toLocaleString()} Application Fee</span>
                </div>
                {session.max_applicants && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Max {session.max_applicants} applicants</span>
                  </div>
                )}
              </div>

              {session.status !== "closed" && (
                <div className="flex gap-2">
                  {session.status === "upcoming" && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => updateSessionStatus(session.id, "active")}
                    >
                      Activate
                    </Button>
                  )}
                  {session.status === "active" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() => updateSessionStatus(session.id, "closed")}
                    >
                      Close
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
