import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MessageSquare, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Msg { id: string; thread_id: string; sender_role: string; subject: string | null; body: string; created_at: string; read_at: string | null; }

export const ParentMessagesInbox: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ subject: '', body: '' });
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase.from('parent_messages').select('*').eq('parent_user_id', user.id).order('created_at', { ascending: true });
    setMsgs((data || []) as Msg[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user?.id) return;
    const ch = supabase.channel('parent-messages-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parent_messages', filter: `parent_user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const threads = useMemo(() => {
    const by = new Map<string, Msg[]>();
    msgs.forEach(m => { const a = by.get(m.thread_id) || []; a.push(m); by.set(m.thread_id, a); });
    return Array.from(by.entries()).map(([tid, arr]) => ({ thread_id: tid, last: arr[arr.length - 1], count: arr.length }))
      .sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime());
  }, [msgs]);

  const activeMsgs = useMemo(() => msgs.filter(m => m.thread_id === active), [msgs, active]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMsgs.length]);

  const send = async () => {
    if (!reply.trim() || !active || !user?.id) return;
    setSending(true);
    const { error } = await supabase.from('parent_messages').insert({
      thread_id: active, parent_user_id: user.id, sender_role: 'parent',
      sender_user_id: user.id, body: reply.trim(),
    } as any);
    setSending(false);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { setReply(''); load(); }
  };

  const startNew = async () => {
    if (!newForm.body.trim() || !user?.id) return;
    const { error } = await supabase.from('parent_messages').insert({
      parent_user_id: user.id, sender_role: 'parent', sender_user_id: user.id,
      subject: newForm.subject || null, body: newForm.body.trim(),
    } as any);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { setNewOpen(false); setNewForm({ subject: '', body: '' }); load(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Messages with School</CardTitle>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New message to school</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-1"><Label>Subject</Label><Input value={newForm.subject} onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))} /></div>
              <div className="grid gap-1"><Label>Message</Label><Textarea rows={5} value={newForm.body} onChange={e => setNewForm(f => ({ ...f, body: e.target.value }))} /></div>
              <Button onClick={startNew} disabled={!newForm.body.trim()}><Send className="h-4 w-4 mr-1" /> Send</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6" /></div> : (
          <div className="grid md:grid-cols-[240px_1fr] min-h-[520px]">
            <div className="border-r max-h-[600px] overflow-auto">
              {threads.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p> : threads.map(t => (
                <button key={t.thread_id} onClick={() => setActive(t.thread_id)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/50 ${active === t.thread_id ? 'bg-muted' : ''}`}>
                  <div className="font-medium truncate">{t.last.subject || 'Conversation'}</div>
                  <p className="text-xs text-muted-foreground truncate">{t.last.body}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.last.created_at).toLocaleString()}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-col">
              {!active ? <div className="flex-1 flex items-center justify-center text-muted-foreground p-6 text-center">Select or start a conversation with the school.</div> : (
                <>
                  <div className="flex-1 max-h-[500px] overflow-auto p-3 space-y-2">
                    {activeMsgs.map(m => (
                      <div key={m.id} className={`flex ${m.sender_role === 'parent' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-lg p-2 text-sm ${m.sender_role === 'parent' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
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

export default ParentMessagesInbox;