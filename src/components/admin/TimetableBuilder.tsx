import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Users, MapPin, AlertCircle, Plus, Edit, Trash2, Copy, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TimetableBuilder = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
    fetchClasses();
    fetchSubjects();
    fetchTeachers();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      fetchPeriods(selectedTemplate);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate && selectedClass) {
      fetchTimetable(selectedTemplate, selectedClass);
    }
  }, [selectedTemplate, selectedClass]);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('timetable_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setTemplates(data || []);
      if (data && data.length > 0 && data[0].is_active) {
        setSelectedTemplate(data[0].id);
      }
    }
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    setClasses(data || []);
  };

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    setSubjects(data || []);
  };

  const fetchTeachers = async () => {
    // Get all users with teacher or admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['teacher', 'admin']);
    
    if (roleData && roleData.length > 0) {
      const userIds = roleData.map(r => r.user_id);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      
      const teachersList = profiles?.map(p => ({
        id: p.user_id,
        name: p.full_name
      })) || [];
      setTeachers(teachersList);
    }
  };

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').eq('is_active', true).order('room_number');
    setRooms(data || []);
  };

  const fetchPeriods = async (templateId: string) => {
    const { data } = await supabase
      .from('periods')
      .select('*')
      .eq('template_id', templateId)
      .order('period_number');
    setPeriods(data || []);
  };

  const fetchTimetable = async (templateId: string, classId: string) => {
    const { data } = await supabase
      .from('class_timetables')
      .select(`
        *,
        subject:subjects(name),
        teacher:profiles!class_timetables_teacher_id_fkey(full_name),
        room:rooms(room_number, room_name),
        period:periods(period_number, period_name, start_time, end_time)
      `)
      .eq('template_id', templateId)
      .eq('class_id', classId);
    
    setTimetable(data || []);
  };

  const checkConflicts = async (data: any) => {
    const { data: result } = await supabase.rpc('check_timetable_conflict', {
      p_template_id: data.template_id,
      p_period_id: data.period_id,
      p_day_of_week: data.day_of_week,
      p_teacher_id: data.teacher_id,
      p_room_id: data.room_id,
      p_exclude_id: data.id || null
    });
    
    return result as any;
  };

  const handleSaveEntry = async (entry: any) => {
    setIsLoading(true);
    
    // Check conflicts first
    const conflictCheck = await checkConflicts(entry);
    if (conflictCheck?.has_conflicts) {
      setConflicts(conflictCheck.conflicts);
      setIsLoading(false);
      return;
    }
    
    const { error } = await supabase
      .from('class_timetables')
      .upsert(entry);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Timetable entry saved' });
      fetchTimetable(selectedTemplate!, selectedClass!);
      setConflicts(null);
    }
    setIsLoading(false);
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('class_timetables')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Entry deleted' });
      fetchTimetable(selectedTemplate!, selectedClass!);
    }
  };

  const getTimetableEntry = (dayIndex: number, period: any) => {
    return timetable.find(
      entry => entry.day_of_week === dayIndex + 1 && entry.period_id === period.id
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Timetable Builder</h2>
          <p className="text-muted-foreground">Create and manage class schedules</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Timetable Template</DialogTitle>
            </DialogHeader>
            <TemplateForm onSuccess={fetchTemplates} />
          </DialogContent>
        </Dialog>
      </div>

      {conflicts && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Scheduling Conflict:</strong>
            <ul className="mt-2 ml-4 list-disc">
              {conflicts.map((c: any, i: number) => (
                <li key={i}>{c.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTemplate || ''} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.is_active && <Badge className="ml-2">Active</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClass || ''} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full" size="sm">
              <Copy className="mr-2 h-4 w-4" />Copy from Template
            </Button>
            <Button variant="outline" className="w-full" size="sm">
              <Download className="mr-2 h-4 w-4" />Export PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {selectedTemplate && selectedClass && periods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Timetable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Period</TableHead>
                    {DAYS.map(day => (
                      <TableHead key={day}>{day}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.filter(p => p.is_teaching_period).map(period => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{period.period_name || `Period ${period.period_number}`}</div>
                          <div className="text-xs text-muted-foreground">
                            {period.start_time} - {period.end_time}
                          </div>
                        </div>
                      </TableCell>
                      {DAYS.map((day, dayIndex) => {
                        const entry = getTimetableEntry(dayIndex, period);
                        return (
                          <TableCell key={`${day}-${period.id}`}>
                            <TimetableCell
                              entry={entry}
                              templateId={selectedTemplate}
                              classId={selectedClass}
                              periodId={period.id}
                              dayOfWeek={dayIndex + 1}
                              subjects={subjects}
                              teachers={teachers}
                              rooms={rooms}
                              onSave={handleSaveEntry}
                              onDelete={handleDeleteEntry}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const TemplateForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    academic_year: new Date().getFullYear().toString(),
    term: 'First Term',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from('timetable_templates').insert(formData);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Template created' });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Template Name</Label>
        <Input 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          placeholder="e.g., 2024/2025 First Term" 
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Academic Year</Label>
          <Input 
            value={formData.academic_year}
            onChange={e => setFormData({...formData, academic_year: e.target.value})}
            placeholder="2024/2025"
            required
          />
        </div>
        <div>
          <Label>Term</Label>
          <Select value={formData.term} onValueChange={term => setFormData({...formData, term})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="First Term">First Term</SelectItem>
              <SelectItem value="Second Term">Second Term</SelectItem>
              <SelectItem value="Third Term">Third Term</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full">Create Template</Button>
    </form>
  );
};

const TimetableCell = ({ entry, templateId, classId, periodId, dayOfWeek, subjects, teachers, rooms, onSave, onDelete }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    subject_id: entry?.subject_id || '',
    teacher_id: entry?.teacher_id || '',
    room_id: entry?.room_id || '',
    notes: entry?.notes || '',
  });

  if (!entry && !isEditing) {
    return (
      <Button variant="ghost" size="sm" className="w-full" onClick={() => setIsEditing(true)}>
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-2 p-2 border rounded">
        <Select value={formData.subject_id} onValueChange={subject_id => setFormData({...formData, subject_id})}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={formData.teacher_id} onValueChange={teacher_id => setFormData({...formData, teacher_id})}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Teacher" />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={formData.room_id} onValueChange={room_id => setFormData({...formData, room_id})}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Room" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" className="flex-1" onClick={() => {
            onSave({
              ...formData,
              template_id: templateId,
              class_id: classId,
              period_id: periodId,
              day_of_week: dayOfWeek,
              id: entry?.id
            });
            setIsEditing(false);
          }}>Save</Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs space-y-1 p-2 border rounded bg-accent/50">
      <div className="font-medium">{entry.subject?.name}</div>
      <div className="text-muted-foreground">{entry.teacher?.full_name}</div>
      <div className="flex items-center text-muted-foreground">
        <MapPin className="h-3 w-3 mr-1" />
        {entry.room?.room_number}
      </div>
      <div className="flex gap-1 mt-2">
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setIsEditing(true)}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => onDelete(entry.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
