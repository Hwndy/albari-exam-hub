import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MessageSquare, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Msg {
  id: string; thread_id: string; parent_user_id: string; sender_role: string; sender_user_id: string;
  subject: string | null; body: string; read_at: string | null; created_at: string; student_id: string | null;
}
interface Thread { thread_id: string; parent_user_id: string; parent_name: string; last: Msg; unread: number; }

export const MessagesInbox: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [parents, setParents] = useState<{ user_id: string; full_name: string }[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ parent_user_id: '', subject: '', body: '' });
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('parent_messages').select('*').order('created_at', { ascending: true }).limit(500);
    setMsgs((data || []) as Msg[]);
    const uids = Array.from(new Set([...(data || []).map((m: any) => m.parent_user_id)]));
    if (uids.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', uids);
      setNames(new Map((profs || []).map((p: any) => [p.user_id, p.full_name])));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('parents').select('user_id').then(async ({ data }) => {
      const ids = (data || []).map((p: any) => p.user_id);
      if (!ids.length) return;
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
      setParents((profs || []) as any);
    });
    const ch = supabase.channel('admin-parent-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parent_messages' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const threads: Thread[] = useMemo(() => {
    const by = new Map<string, Msg[]>();
    msgs.forEach(m => { const arr = by.get(m.thread_id) || []; arr.push(m); by.set(m.thread_id, arr); });
    return Array.from(by.entries()).map(([tid, arr]) => {
      const last = arr[arr.length - 1];
      const unread = arr.filter(m => m.sender_role === 'parent' && !m.read_at).length;
      return { thread_id: tid, parent_user_id: last.parent_user_id, parent_name: names.get(last.parent_user_id) || 'Parent', last, unread };
    }).sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime());
  }, [msgs, names]);

  const activeMsgs = useMemo(() => msgs.filter(m => m.thread_id === active).sort((a, b) => a.created_at.localeCompare(b.created_at)), [msgs, active]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMsgs.length]);

  useEffect(() => {
    if (!active) return;
    const unread = activeMsgs.filter(m => m.sender_role === 'parent' && !m.read_at).map(m => m.id);
    if (unread.length) {
      supabase.from('parent_messages').update({ read_at: new Date().toISOString() }).in('id', unread).then(() => {});
    }
  }, [active, activeMsgs]);

  const send = async () => {
    if (!reply.trim() || !active || !user?.id) return;
    const thread = threads.find(t => t.thread_id === active);
    if (!thread) return;
    setSending(true);
    const { error } = await supabase.from('parent_messages').insert({
      thread_id: active, parent_user_id: thread.parent_user_id, sender_role: 'admin',
      sender_user_id: user.id, body: reply.trim(), subject: thread.last.subject,
    } as any);
    setSending(false);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { setReply(''); load(); }
  };

  const startNew = async () => {
    if (!newForm.parent_user_id || !newForm.body.trim() || !user?.id) return;
    const { error } = await supabase.from('parent_messages').insert({
      parent_user_id: newForm.parent_user_id, sender_role: 'admin', sender_user_id: user.id,
      subject: newForm.subject || null, body: newForm.body.trim(),
    } as any);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { setNewOpen(false); setNewForm({ parent_user_id: '', subject: '', body: '' }); load(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Parent Messages</CardTitle>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New message</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-1"><Label>Parent</Label>
                <Select value={newForm.parent_user_id} onValueChange={v => setNewForm(f => ({ ...f, parent_user_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choose parent" /></SelectTrigger>
                  <SelectContent>{parents.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1"><Label>Subject</Label><Input value={newForm.subject} onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))} /></div>
              <div className="grid gap-1"><Label>Message</Label><Textarea rows={5} value={newForm.body} onChange={e => setNewForm(f => ({ ...f, body: e.target.value }))} /></div>
              <Button onClick={startNew} disabled={!newForm.parent_user_id || !newForm.body.trim()}><Send className="h-4 w-4 mr-1" /> Send</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6" /></div> : (
          <div className="grid md:grid-cols-[280px_1fr] min-h-[520px]">
            <div className="border-r max-h-[600px] overflow-auto">
              {threads.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No messages yet.</p> : threads.map(t => (
                <button key={t.thread_id} onClick={() => setActive(t.thread_id)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/50 ${active === t.thread_id ? 'bg-muted' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{t.parent_name}</span>
                    {t.unread > 0 && <Badge className="h-5">{t.unread}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.last.body}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.last.created_at).toLocaleString()}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-col">
              {!active ? <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a conversation</div> : (
                <>
                  <div className="flex-1 max-h-[500px] overflow-auto p-3 space-y-2">
                    {activeMsgs.map(m => (
                      <div key={m.id} className={`flex ${m.sender_role === 'admin' || m.sender_role === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-lg p-2 text-sm ${m.sender_role === 'parent' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                          {m.subject && <div className="text-xs font-semibold mb-1 opacity-80">{m.subject}</div>}
                          <div className="whitespace-pre-wrap">{m.body}</div>
                          <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                  <div className="border-t p-3 flex gap-2">
                    <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type reply..." rows={2} />
                    <Button onClick={send} disabled={sending || !reply.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MessagesInbox;