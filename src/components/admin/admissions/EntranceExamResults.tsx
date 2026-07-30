import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Mail, RefreshCw, RotateCcw, Save } from "lucide-react";

interface ResultRow {
  assignment_id: string;
  application_id: string;
  application_number: string;
  full_name: string;
  email: string;
  status: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  result_status: string;
  comment: string | null;
  source: string;
  result_sent_at: string | null;
  resit_sent_at: string | null;
  online_score: number | null;
  online_max_score: number | null;
  online_percentage: number | null;
}

interface Props {
  examId: string;
  examTitle: string;
  defaultMaxScore?: number | null;
}

const pct = (score: number | null, max: number | null) =>
  score != null && max != null && max > 0 ? Math.round((score / max) * 10000) / 100 : null;

export const EntranceExamResults = ({ examId, examTitle, defaultMaxScore }: Props) => {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_entrance_exam_results", { p_exam_id: examId });
    if (error) {
      toast.error("Failed to load results: " + error.message);
      setRows([]);
    } else {
      setRows(((data as any[]) || []).map((r) => ({
        ...r,
        max_score: r.max_score ?? r.online_max_score ?? defaultMaxScore ?? null,
      })) as ResultRow[]);
    }
    setLoading(false);
  }, [examId, defaultMaxScore]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const patch = (id: string, changes: Partial<ResultRow>) =>
    setRows((prev) => prev.map((r) => (r.assignment_id === id ? { ...r, ...changes } : r)));

  const pullOnline = () => {
    let pulled = 0;
    setRows((prev) => prev.map((r) => {
      if (r.online_score == null) return r;
      pulled += 1;
      return {
        ...r,
        score: r.online_score,
        max_score: r.online_max_score ?? r.max_score,
        percentage: r.online_percentage ?? pct(r.online_score, r.online_max_score),
        source: "online",
      };
    }));
    toast.success(pulled ? `Pulled ${pulled} online score(s). Remember to save.` : "No online sessions found for this exam");
  };

  const save = async (row: ResultRow) => {
    setBusy(row.assignment_id);
    const { error } = await supabase.rpc("save_entrance_exam_result", {
      p_assignment_id: row.assignment_id,
      p_score: row.score,
      p_max_score: row.max_score,
      p_result_status: row.result_status || "pending",
      p_comment: row.comment,
      p_source: row.source || "manual",
    });
    setBusy(null);
    if (error) return toast.error("Save failed: " + error.message);
    patch(row.assignment_id, { percentage: pct(row.score, row.max_score) });
    toast.success(`Saved result for ${row.full_name}`);
  };

  const sendEmail = async (row: ResultRow, kind: "result" | "resit") => {
    if (kind === "result" && row.score == null) {
      return toast.error("Enter and save a score before sending the result");
    }
    setBusy(row.assignment_id);
    try {
      const { error } = await supabase.functions.invoke("send-admission-notification", {
        body: {
          application_id: row.application_id,
          notification_type: kind === "result" ? "exam_result" : "exam_resit",
          additional_data: {
            exam_title: examTitle,
            score: row.score,
            max_score: row.max_score,
            percentage: row.percentage ?? pct(row.score, row.max_score),
            result_status: row.result_status,
            comment: row.comment,
          },
        },
      });
      if (error) throw error;
      await supabase.rpc("mark_entrance_result_sent", { p_assignment_id: row.assignment_id, p_kind: kind });
      patch(row.assignment_id, kind === "result"
        ? { result_sent_at: new Date().toISOString() }
        : { resit_sent_at: new Date().toISOString() });
      toast.success(`${kind === "result" ? "Result" : "Resit"} email sent to ${row.email}`);
    } catch (e: any) {
      toast.error(`Failed to send email: ${e.message ?? e}`);
    } finally {
      setBusy(null);
    }
  };

  const sendAllRecorded = async () => {
    const targets = rows.filter((r) => r.score != null && r.result_status !== "pending");
    if (!targets.length) return toast.error("No saved results to send");
    for (const r of targets) await sendEmail(r, "resit" === r.result_status ? "resit" : "result");
  };

  const exportCsv = () => {
    const header = ["Application", "Name", "Email", "Score", "Total", "Percentage", "Outcome", "Comment"];
    const body = rows.map((r) => [
      r.application_number, r.full_name, r.email, r.score ?? "", r.max_score ?? "",
      r.percentage ?? pct(r.score, r.max_score) ?? "", r.result_status, (r.comment || "").replace(/"/g, "'"),
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${examTitle.replace(/\s+/g, "-").toLowerCase()}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scored = rows.filter((r) => r.percentage != null || r.score != null);
  const avg = scored.length
    ? Math.round(scored.reduce((s, r) => s + (r.percentage ?? pct(r.score, r.max_score) ?? 0), 0) / scored.length)
    : 0;
  const passRate = rows.length
    ? Math.round((rows.filter((r) => r.result_status === "pass").length / rows.length) * 100)
    : 0;

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading results...</div>;

  if (!rows.length) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        No applicants assigned to this exam yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {rows.length} applicant(s) · Avg {avg}% · Pass rate {passRate}%
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={pullOnline}>
            <RefreshCw className="h-4 w-4 mr-2" /> Pull online scores
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={sendAllRecorded}>
            <Mail className="h-4 w-4 mr-2" /> Send to all recorded
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const percentage = row.percentage ?? pct(row.score, row.max_score);
          return (
            <Card key={row.assignment_id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.application_number} · {row.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.online_score != null && (
                      <Badge variant="secondary">Online: {row.online_score}/{row.online_max_score ?? "-"}</Badge>
                    )}
                    <Badge variant={row.source === "online" ? "secondary" : "outline"}>{row.source}</Badge>
                    {percentage != null && <Badge>{percentage}%</Badge>}
                    {row.result_sent_at && <Badge variant="outline">Result sent</Badge>}
                    {row.resit_sent_at && <Badge variant="outline">Resit sent</Badge>}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Score</label>
                    <Input
                      type="number"
                      value={row.score ?? ""}
                      onChange={(e) => patch(row.assignment_id, {
                        score: e.target.value === "" ? null : Number(e.target.value),
                        source: "manual",
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Total mark</label>
                    <Input
                      type="number"
                      value={row.max_score ?? ""}
                      onChange={(e) => patch(row.assignment_id, {
                        max_score: e.target.value === "" ? null : Number(e.target.value),
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Outcome</label>
                    <Select
                      value={row.result_status || "pending"}
                      onValueChange={(v) => patch(row.assignment_id, { result_status: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                        <SelectItem value="resit">Resit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Comment to applicant</label>
                  <Textarea
                    rows={2}
                    value={row.comment ?? ""}
                    placeholder="e.g. Strong performance in Mathematics, needs improvement in English."
                    onChange={(e) => patch(row.assignment_id, { comment: e.target.value })}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" disabled={busy === row.assignment_id} onClick={() => save(row)}>
                    <Save className="h-4 w-4 mr-2" /> Save
                  </Button>
                  <Button size="sm" disabled={busy === row.assignment_id} onClick={() => sendEmail(row, "result")}>
                    <Mail className="h-4 w-4 mr-2" /> Send result
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === row.assignment_id}
                    onClick={() => sendEmail(row, "resit")}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Send resit email
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default EntranceExamResults;
