import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, X } from 'lucide-react';

interface InterviewPanelManagerProps {
  interviewId: string;
  onUpdate: () => void;
  trigger?: React.ReactNode;
}

export const InterviewPanelManager: React.FC<InterviewPanelManagerProps> = ({
  interviewId,
  onUpdate,
  trigger,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [panelMembers, setPanelMembers] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      // First check if interview exists
      const { data: interview } = await supabase
        .from('admission_interviews')
        .select('id')
        .eq('id', interviewId)
        .single();

      if (!interview) {
        toast({
          title: 'Error',
          description: 'Interview not found. Please schedule an interview first.',
          variant: 'destructive',
        });
        setOpen(false);
        return;
      }

      // Load staff with admin or teacher roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('role', ['admin', 'teacher'])
        .order('full_name');

      if (profiles) setStaff(profiles);

      // Load existing panel members
      const { data: panel } = await supabase
        .from('interview_panels')
        .select(`
          *,
          profiles:interviewer_id(user_id, full_name, role)
        `)
        .eq('interview_id', interviewId);

      if (panel) setPanelMembers(panel);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load interview data',
        variant: 'destructive',
      });
    }
  };

  const handleAddMember = async () => {
    if (!selectedStaff || !selectedRole) {
      toast({
        title: 'Missing Information',
        description: 'Please select a staff member and role',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('interview_panels')
        .insert({
          interview_id: interviewId,
          interviewer_id: selectedStaff,
          role: selectedRole,
        });

      if (error) throw error;

      toast({
        title: 'Panel Member Added',
        description: 'Interview panel updated successfully',
      });

      setSelectedStaff('');
      setSelectedRole('');
      loadData();
      onUpdate();
    } catch (error: any) {
      console.error('Error adding panel member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add panel member',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (panelId: string) => {
    try {
      const { error } = await supabase
        .from('interview_panels')
        .delete()
        .eq('id', panelId);

      if (error) throw error;

      toast({
        title: 'Panel Member Removed',
        description: 'Interview panel updated successfully',
      });

      loadData();
      onUpdate();
    } catch (error: any) {
      console.error('Error removing panel member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove panel member',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Manage Panel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Interview Panel</DialogTitle>
          <DialogDescription>
            Assign interviewers to this interview session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium">Add Panel Member</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Staff Member</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {s.full_name} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Panel Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Principal">Principal</SelectItem>
                    <SelectItem value="Head of Department">Head of Department</SelectItem>
                    <SelectItem value="Subject Teacher">Subject Teacher</SelectItem>
                    <SelectItem value="Counselor">Counselor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleAddMember} disabled={loading} className="w-full">
              Add to Panel
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Current Panel Members ({panelMembers.length})</h4>
            {panelMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No panel members assigned yet</p>
            ) : (
              <div className="space-y-2">
                {panelMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{member.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
