import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare } from 'lucide-react';

interface InterviewFeedbackFormProps {
  interviewId: string;
  onSubmit: () => void;
  trigger?: React.ReactNode;
}

export const InterviewFeedbackForm: React.FC<InterviewFeedbackFormProps> = ({
  interviewId,
  onSubmit,
  trigger,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [communication, setCommunication] = useState([5]);
  const [aptitude, setAptitude] = useState([5]);
  const [character, setCharacter] = useState([5]);
  const [motivation, setMotivation] = useState([5]);
  const [comments, setComments] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const handleSubmit = async () => {
    if (!recommendation) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a recommendation',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const ratings = {
        communication: communication[0],
        aptitude: aptitude[0],
        character: character[0],
        motivation: motivation[0],
      };

      const { error } = await supabase
        .from('interview_feedback')
        .insert({
          interview_id: interviewId,
          panel_member_id: user?.id,
          ratings,
          comments,
          recommendation,
        });

      if (error) throw error;

      // Calculate aggregate score
      const avgScore = Object.values(ratings).reduce((a, b) => a + b, 0) / 4;
      
      await supabase
        .from('admission_interviews')
        .update({ aggregate_score: avgScore })
        .eq('id', interviewId);

      toast({
        title: 'Feedback Submitted',
        description: 'Your interview feedback has been recorded',
      });

      setOpen(false);
      onSubmit();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Provide Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interview Feedback</DialogTitle>
          <DialogDescription>
            Provide your assessment of the applicant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Communication Skills (1-10)</Label>
              <Slider
                value={communication}
                onValueChange={setCommunication}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground text-center">{communication[0]}</p>
            </div>

            <div className="space-y-2">
              <Label>Academic Aptitude (1-10)</Label>
              <Slider
                value={aptitude}
                onValueChange={setAptitude}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground text-center">{aptitude[0]}</p>
            </div>

            <div className="space-y-2">
              <Label>Character & Behavior (1-10)</Label>
              <Slider
                value={character}
                onValueChange={setCharacter}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground text-center">{character[0]}</p>
            </div>

            <div className="space-y-2">
              <Label>Motivation & Interest (1-10)</Label>
              <Slider
                value={motivation}
                onValueChange={setMotivation}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground text-center">{motivation[0]}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Additional observations and notes..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Recommendation</Label>
            <Select value={recommendation} onValueChange={setRecommendation}>
              <SelectTrigger>
                <SelectValue placeholder="Select recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Strongly Recommend">Strongly Recommend</SelectItem>
                <SelectItem value="Recommend">Recommend</SelectItem>
                <SelectItem value="Neutral">Neutral</SelectItem>
                <SelectItem value="Do Not Recommend">Do Not Recommend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
