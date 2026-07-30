import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export interface PaperSubject { subject: string; max: number }

export interface EditableExam {
  id: string;
  title: string;
  start_date: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  status: string | null;
  exam_mode?: string | null;
  paper_subjects?: PaperSubject[] | null;
  instructions?: string | null;
}

interface Props {
  exam: EditableExam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const toLocalInput = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

export const EntranceExamEditor = ({ exam, open, onOpenChange, onSaved }: Props) => {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState(0);
  const [subjects, setSubjects] = useState<PaperSubject[]>([]);

  const isPaper = exam?.exam_mode === "paper";

  useEffect(() => {
    if (!exam) return;
    setTitle(exam.title || "");
    setExamDate(toLocalInput(exam.start_date));
    setInstructions(exam.instructions || "");
    setDuration(exam.duration_minutes || 0);
    setSubjects((exam.paper_subjects || []).map((s) => ({ subject: s.subject, max: Number(s.max) || 0 })));
  }, [exam]);

  const total = subjects.reduce((s, r) => s + (Number(r.max) || 0), 0);
  const patch = (i: number, changes: Partial<PaperSubject>) =>
    setSubjects((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...changes } : r)));

  const save = async () => {
    if (!exam) return;
    if (!title.trim()) return toast.error("Enter a title");
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        instructions: instructions || null,
        start_date: examDate ? new Date(examDate).toISOString() : null,
      };
      if (isPaper) {
        const clean = subjects
          .map((s) => ({ subject: s.subject.trim(), max: Number(s.max) || 0 }))
          .filter((s) => s.subject);
        if (!clean.length) { toast.error("Add at least one subject"); setSaving(false); return; }
        payload.paper_subjects = clean;
      } else {
        payload.duration_minutes = Number(duration) || 0;
      }

      const { error } = await supabase.from("exams").update(payload as any).eq("id", exam.id);
      if (error) throw error;
      toast.success("Exam updated");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error("Failed to update: " + (e.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {isPaper ? "Paper" : "CBT"} Entrance Exam</DialogTitle>
          <DialogDescription>Update the sitting details. Existing results are kept.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Exam date &amp; time</Label>
            <Input type="datetime-local" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>

          {isPaper ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subjects &amp; maximum marks</Label>
                <span className="text-xs text-muted-foreground">Total: {total}</span>
              </div>
              {subjects.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input className="flex-1" value={s.subject} placeholder="Subject"
                    onChange={(e) => patch(i, { subject: e.target.value })} />
                  <Input className="w-24" type="number" value={s.max}
                    onChange={(e) => patch(i, { max: Number(e.target.value) })} />
                  <Button variant="ghost" size="icon"
                    onClick={() => setSubjects((prev) => prev.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm"
                onClick={() => setSubjects((prev) => [...prev, { subject: "", max: 20 }])}>
                <Plus className="h-4 w-4 mr-2" /> Add subject
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes / instructions</Label>
            <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EntranceExamEditor;
