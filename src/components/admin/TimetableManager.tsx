import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, Clock, Users, BookOpen, Trash2, Edit, Save, AlertTriangle, Loader2 } from 'lucide-react';

interface Period {
  id: string;
  period_number: number;
  period_name: string | null;
  start_time: string;
  end_time: string;
  period_type: string | null;
  is_teaching_period: boolean;
}

interface TimetableEntry {
  id: string;
  class_id: string;
  day_of_week: number;
  period_id: string;
  subject_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  notes: string | null;
  subject?: { name: string };
  teacher?: { full_name: string };
  room?: { name: string };
}

interface ClassData {
  id: string;
  name: string;
}

interface SubjectData {
  id: string;
  name: string;
}

interface TeacherData {
  user_id: string;
  full_name: string;
}

interface RoomData {
  id: string;
  room_name: string;
  capacity: number | null;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TimetableManager: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<TimetableEntry> | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  
  const [newPeriod, setNewPeriod] = useState({
    period_number: 1,
    period_name: '',
    start_time: '08:00',
    end_time: '08:45',
    period_type: 'regular',
    is_teaching_period: true,
  });

  useEffect(() => {
    fetchInitialData();
  }, [schoolId]);

  useEffect(() => {
    if (selectedClass) {
      fetchTimetable();
    }
  }, [selectedClass]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [classesRes, subjectsRes, periodsRes, roomsRes] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('periods').select('*').order('period_number'),
        supabase.from('rooms').select('id, room_name, capacity').order('room_name'),
      ]);

      // Fetch teachers (users with teacher role)
      const profilesQuery = supabase.from('profiles').select('user_id, full_name');
      const profilesRes = await profilesQuery;
      
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      
      const teacherUserIds = new Set(teacherRoles?.map(r => r.user_id) || []);
      const teacherProfiles = (profilesRes.data || []).filter(p => teacherUserIds.has(p.user_id));

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setPeriods(periodsRes.data || []);
      setRooms(roomsRes.data || []);
      setTeachers(teacherProfiles);

      if (classesRes.data && classesRes.data.length > 0) {
        setSelectedClass(classesRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load timetable data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimetable = async () => {
    if (!selectedClass) return;

    try {
      const { data, error } = await supabase
        .from('class_timetables')
        .select(`
          *,
          subjects(name),
          rooms(room_name)
        `)
        .eq('class_id', selectedClass);

      if (error) throw error;

      // Fetch teacher names separately since the relationship is via user_id
      const teacherIds = [...new Set((data || []).map(d => d.teacher_id).filter(Boolean))];
      const { data: teacherProfiles } = teacherIds.length > 0 
        ? await supabase.from('profiles').select('user_id, full_name').in('user_id', teacherIds)
        : { data: [] };
      
      const teacherMap = new Map((teacherProfiles || []).map(p => [p.user_id, p.full_name]));

      const entries = (data || []).map(entry => ({
        ...entry,
        subject: entry.subjects,
        teacher: entry.teacher_id ? { full_name: teacherMap.get(entry.teacher_id) || 'Unknown' } : undefined,
        room: entry.rooms ? { name: entry.rooms.room_name } : undefined,
      }));

      setTimetableEntries(entries as TimetableEntry[]);
      checkConflicts(entries);
    } catch (error) {
      console.error('Error fetching timetable:', error);
    }
  };

  const checkConflicts = (entries: TimetableEntry[]) => {
    const newConflicts: string[] = [];
    
    // Check for teacher conflicts (same teacher, same day, same period)
    entries.forEach((entry, i) => {
      entries.slice(i + 1).forEach(other => {
        if (
          entry.teacher_id && 
          entry.teacher_id === other.teacher_id &&
          entry.day_of_week === other.day_of_week &&
          entry.period_id === other.period_id &&
          entry.class_id !== other.class_id
        ) {
          newConflicts.push(`Teacher conflict: ${entry.teacher?.full_name || 'Unknown'} is assigned to multiple classes at the same time`);
        }

        // Check for room conflicts
        if (
          entry.room_id &&
          entry.room_id === other.room_id &&
          entry.day_of_week === other.day_of_week &&
          entry.period_id === other.period_id &&
          entry.class_id !== other.class_id
        ) {
          newConflicts.push(`Room conflict: ${entry.room?.name || 'Unknown'} is assigned to multiple classes at the same time`);
        }
      });
    });

    setConflicts([...new Set(newConflicts)]);
  };

  const handleSaveEntry = async () => {
    if (!editingEntry || !selectedClass) return;

    try {
      const entryData = {
        class_id: selectedClass,
        day_of_week: editingEntry.day_of_week,
        period_id: editingEntry.period_id,
        subject_id: editingEntry.subject_id || null,
        teacher_id: editingEntry.teacher_id || null,
        room_id: editingEntry.room_id || null,
        notes: editingEntry.notes || null,
              };

      if (editingEntry.id) {
        const { error } = await supabase
          .from('class_timetables')
          .update(entryData)
          .eq('id', editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('class_timetables')
          .insert([entryData]);
        if (error) throw error;
      }

      toast({ title: 'Success', description: 'Timetable entry saved' });
      setIsDialogOpen(false);
      setEditingEntry(null);
      fetchTimetable();
    } catch (error: any) {
      console.error('Error saving entry:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save entry', variant: 'destructive' });
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const { error } = await supabase.from('class_timetables').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Entry deleted' });
      fetchTimetable();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete entry', variant: 'destructive' });
    }
  };

  const handleSavePeriod = async () => {
    try {
      const { error } = await supabase.from('periods').insert([{
        ...newPeriod,
              }]);
      
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Period created' });
      setIsPeriodDialogOpen(false);
      setNewPeriod({
        period_number: periods.length + 1,
        period_name: '',
        start_time: '08:00',
        end_time: '08:45',
        period_type: 'regular',
        is_teaching_period: true,
      });
      fetchInitialData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create period', variant: 'destructive' });
    }
  };

  const getEntryForSlot = (dayIndex: number, periodId: string) => {
    return timetableEntries.find(e => e.day_of_week === dayIndex && e.period_id === periodId);
  };

  const openEntryDialog = (dayIndex: number, periodId: string) => {
    const existing = getEntryForSlot(dayIndex, periodId);
    setEditingEntry(existing || { day_of_week: dayIndex, period_id: periodId });
    setIsDialogOpen(true);
  };

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
          <h2 className="text-2xl font-bold">Timetable Management</h2>
          <p className="text-muted-foreground">Create and manage class timetables</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPeriodDialogOpen(true)}>
            <Clock className="h-4 w-4 mr-2" />
            Add Period
          </Button>
        </div>
      </div>

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive">Scheduling Conflicts Detected</h4>
                <ul className="text-sm text-destructive/80 mt-1 space-y-1">
                  {conflicts.map((conflict, i) => (
                    <li key={i}>• {conflict}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Class</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      {selectedClass && periods.length > 0 ? (
        <Card>
          <CardContent className="p-4 overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="border bg-muted p-2 text-left font-semibold w-24">Time</th>
                  {DAYS.map(day => (
                    <th key={day} className="border bg-muted p-2 text-center font-semibold">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period.id}>
                    <td className="border p-2 bg-muted/50">
                      <div className="text-sm font-medium">
                        {period.period_name || `Period ${period.period_number}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {period.start_time} - {period.end_time}
                      </div>
                      {!period.is_teaching_period && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {period.period_type || 'Break'}
                        </Badge>
                      )}
                    </td>
                    {DAYS.map((_, dayIndex) => {
                      const entry = getEntryForSlot(dayIndex, period.id);
                      const isBreak = !period.is_teaching_period;
                      
                      return (
                        <td 
                          key={dayIndex} 
                          className={`border p-2 ${isBreak ? 'bg-muted/30' : 'hover:bg-accent/50 cursor-pointer'}`}
                          onClick={() => !isBreak && openEntryDialog(dayIndex, period.id)}
                        >
                          {isBreak ? (
                            <div className="text-center text-muted-foreground text-sm italic">
                              {period.period_type || 'Break'}
                            </div>
                          ) : entry ? (
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{entry.subject?.name || 'No subject'}</div>
                              {entry.teacher && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {entry.teacher.full_name}
                                </div>
                              )}
                              {entry.room && (
                                <Badge variant="outline" className="text-xs">
                                  {entry.room.name}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground text-sm">
                              <Plus className="h-4 w-4 mx-auto opacity-50" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {periods.length === 0 ? (
              <div>
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No periods defined yet. Add periods to create your timetable.</p>
              </div>
            ) : (
              <div>
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a class to view and edit its timetable.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entry Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntry?.id ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select 
                value={editingEntry?.subject_id || ''} 
                onValueChange={(v) => setEditingEntry(prev => ({ ...prev, subject_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select 
                value={editingEntry?.teacher_id || ''} 
                onValueChange={(v) => setEditingEntry(prev => ({ ...prev, teacher_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room (Optional)</Label>
              <Select 
                value={editingEntry?.room_id || ''} 
                onValueChange={(v) => setEditingEntry(prev => ({ ...prev, room_id: v || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No room</SelectItem>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.room_name} {r.capacity && `(${r.capacity} seats)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input 
                value={editingEntry?.notes || ''} 
                onChange={(e) => setEditingEntry(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special notes..."
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            {editingEntry?.id && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  handleDeleteEntry(editingEntry.id!);
                  setIsDialogOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEntry}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Period Creation Dialog */}
      <Dialog open={isPeriodDialogOpen} onOpenChange={setIsPeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Number</Label>
                <Input 
                  type="number" 
                  min={1}
                  value={newPeriod.period_number} 
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, period_number: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Period Name</Label>
                <Input 
                  value={newPeriod.period_name} 
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, period_name: e.target.value }))}
                  placeholder="e.g., Morning Assembly"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input 
                  type="time" 
                  value={newPeriod.start_time} 
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input 
                  type="time" 
                  value={newPeriod.end_time} 
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Type</Label>
                <Select 
                  value={newPeriod.period_type} 
                  onValueChange={(v) => setNewPeriod(prev => ({ ...prev, period_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="break">Break</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="assembly">Assembly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Teaching Period?</Label>
                <Select 
                  value={newPeriod.is_teaching_period ? 'yes' : 'no'} 
                  onValueChange={(v) => setNewPeriod(prev => ({ ...prev, is_teaching_period: v === 'yes' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPeriodDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePeriod}>
              <Plus className="h-4 w-4 mr-2" />
              Add Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
