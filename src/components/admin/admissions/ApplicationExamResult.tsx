import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, RotateCcw, Save } from "lucide-react";

interface SubjectScore { subject: string; score: number | null; max: number }

interface ExamOption {
  id: string;
  title: string;
  exam_mode: string | null;
  paper_subjects: { subject: string; max: number }[] | null;
}

interface Props { applicationId: string }

export const ApplicationExamResult = ({ applicationId }: Props) => {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [examId, setExamId] = useState<string>("");
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [subjectScores, setSubjectScores] = useState<SubjectScore[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [resultStatus, setResultStatus] = useState("pending");
  const [comment, setComment] = useState("");
  const [resitDate, setResitDate] = useState("");
  const [resitVenue, setResitVenue] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentExam = exams.find((e) => e.id === examId);
  const subjects = (currentExam?.paper_subjects || []).filter((s) => s?.subject);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: examList }, { data: results }] = await Promise.all([
      supabase.from("exams").select("id, title, exam_mode, paper_subjects")
        .eq("exam_category", "entrance").order("start_date", { ascending: false }),
      supabase.rpc("get_application_exam_results", { p_application_id: applicationId } as any),
    ]);
    setExams((examList || []) as unknown as ExamOption[]);
    const existing = ((results as any[]) || [])[0];
    if (existing) {
      setExamId(existing.exam_id);
      setAssignmentId(existing.assignment_id);
      setSubjectScores(Array.isArray(existing.subject_scores) ? existing.subject_scores : []);
      setScore(existing.score);
      setMaxScore(existing.max_score);
      setResultStatus(existing.result_status || "pending");
      setComment(existing.comment || "");
      setResitDate(existing.resit_date ? new Date(existing.resit_date).toISOString().slice(0, 16) : "");
      setResitVenue(existing.resit_venue || "");
    }
    setLoading(false);
  }, [applicationId]);

  useEffect(() => { load(); }, [load]);

  // keep the subject grid aligned with the selected sitting
  useEffect(() => {
    if (!subjects.length) return;
    setSubjectScores((prev) =>
      subjects.map((s) => {
        const hit = prev.find((x) => x.subject === s.subject);
        return { subject: s.subject, max: Number(s.max) || 0, score: hit?.score ?? null };
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, JSON.stringify(subjects)]);

  const totals = subjects.length
    ? {
        score: subjectScores.reduce((s, r) => s + (r.score ?? 0), 0),
        max: subjectScores.reduce((s, r) => s + (Number(r.max) || 0), 0),
      }
    : { score: score ?? 0, max: maxScore ?? 0 };
  const percentage = totals.max > 0 ? Math.round((totals.score / totals.max) * 10000) / 100 : null;

  const ensureAssignment = async () => {
    if (assignmentId) return assignmentId;
    if (!examId) { toast.error("Select an exam sitting first"); return null; }
    const { data, error } = await supabase.rpc("attach_application_to_exam", {
      p_application_id: applicationId, p_exam_id: examId,
    } as any);
    if (error) { toast.error("Failed: " + error.message); return null; }
    setAssignmentId(data as string);
    return data as string;
  };

  const save = async () => {
    setBusy(true);
    try {
      const id = await ensureAssignment();
      if (!id) return;
      const { error } = await supabase.rpc("save_entrance_exam_result", {
        p_assignment_id: id,
        p_score: subjects.length ? totals.score : score,
        p_max_score: subjects.length ? totals.max : maxScore,
        p_result_status: resultStatus,
        p_comment: comment || null,
        p_source: "manual",
        p_subject_scores: (subjects.length ? subjectScores : []) as any,
      } as any);
      if (error) throw error;
      toast.success("Entrance exam result saved");
    } catch (e: any) {
      toast.error("Save failed: " + (e.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const send = async (kind: "result" | "resit") => {
    setBusy(true);
    try {
      const id = await ensureAssignment();
      if (!id) return;
      if (kind === "resit") {
        if (!resitDate) { toast.error("Set the resit date and time first"); return; }
        await supabase.rpc("set_entrance_resit_details", {
          p_assignment_id: id,
          p_resit_date: new Date(resitDate).toISOString(),
          p_resit_venue: resitVenue || null,
        } as any);
      }
      const { error } = await supabase.functions.invoke("send-admission-notification", {
        body: {
          application_id: applicationId,
          notification_type: kind === "result" ? "exam_result" : "exam_resit",
          additional_data: {
            exam_title: currentExam?.title,
            score: totals.score,
            max_score: totals.max,
            percentage,
            result_status: resultStatus,
            comment,
            subject_scores: subjectScores.filter((s) => s.score != null),
            resit_date: resitDate
              ? new Date(resitDate).toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short" })
              : null,
            resit_venue: resitVenue || null,
          },
        },
      });
      if (error) throw error;
      await supabase.rpc("mark_entrance_result_sent", { p_assignment_id: id, p_kind: kind });
      toast.success(`${kind === "result" ? "Result" : "Resit"} email sent`);
    } catch (e: any) {
      toast.error("Failed to send: " + (e.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading entrance exam result...</p>;

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">Entrance Exam Result</h4>
        {percentage != null && <Badge>{percentage}%</Badge>}
      </div>

      <div className="space-y-2">
        <Label>Exam sitting</Label>
        <Select value={examId} onValueChange={(v) => { setExamId(v); setAssignmentId(null); }}>
          <SelectTrigger><SelectValue placeholder="Select the exam sitting" /></SelectTrigger>
          <SelectContent>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.title} {e.exam_mode === "paper" ? "(Paper)" : "(CBT)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {subjects.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {subjects.map((s) => (
            <div key={s.subject} className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {s.subject} <span className="opacity-60">/ {s.max}</span>
              </label>
              <Input
                type="number"
                value={subjectScores.find((x) => x.subject === s.subject)?.score ?? ""}
                onChange={(e) => setSubjectScores((prev) => prev.map((x) =>
                  x.subject === s.subject
                    ? { ...x, score: e.target.value === "" ? null : Number(e.target.value) }
                    : x))}
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Total</label>
            <Input readOnly value={`${totals.score} / ${totals.max}`} />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Score</label>
            <Input type="number" value={score ?? ""}
              onChange={(e) => setScore(e.target.value === "" ? null : Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Total mark</label>
            <Input type="number" value={maxScore ?? ""}
              onChange={(e) => setMaxScore(e.target.value === "" ? null : Number(e.target.value))} />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Outcome</label>
          <Select value={resultStatus} onValueChange={setResultStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
              <SelectItem value="resit">Resit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Resit date &amp; time</label>
          <Input type="datetime-local" value={resitDate} onChange={(e) => setResitDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Resit venue</label>
          <Input value={resitVenue} onChange={(e) => setResitVenue(e.target.value)} placeholder="Campus hall" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Comment to applicant</label>
        <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={save}>
          <Save className="h-4 w-4 mr-2" /> Save result
        </Button>
        <Button size="sm" disabled={busy} onClick={() => send("result")}>
          <Mail className="h-4 w-4 mr-2" /> Send result
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => send("resit")}>
          <RotateCcw className="h-4 w-4 mr-2" /> Send resit email
        </Button>
      </div>
    </div>
  );
};

export default ApplicationExamResult;