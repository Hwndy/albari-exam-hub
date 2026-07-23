import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import type { Testimonial } from '@/types/website';

export const TestimonialManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const query = supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      toast({ title: 'Success', description: 'Testimonial deleted' });
    },
  });

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTestimonial(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Testimonials</CardTitle>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Testimonial
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-32 bg-muted rounded"></div>
              ))}
            </div>
          ) : testimonials && testimonials.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{testimonial.name}</h4>
                          {testimonial.is_featured && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {testimonial.role}
                          </Badge>
                          <Badge variant={testimonial.is_published ? 'default' : 'secondary'}>
                            {testimonial.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        {testimonial.rating && (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < testimonial.rating!
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {testimonial.content}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(testimonial)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this testimonial?')) {
                              deleteMutation.mutate(testimonial.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No testimonials found
            </div>
          )}
        </CardContent>
      </Card>

      <TestimonialDialog
        testimonial={editingTestimonial}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        userId={user?.id || ''}
      />
    </div>
  );
};

interface TestimonialDialogProps {
  testimonial: Testimonial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const TestimonialDialog = ({ testimonial, open, onOpenChange, userId }: TestimonialDialogProps) => {
  const [name, setName] = useState(testimonial?.name || '');
  const [role, setRole] = useState<'student' | 'parent' | 'alumni' | 'staff'>(
    testimonial?.role || 'student'
  );
  const [content, setContent] = useState(testimonial?.content || '');
  const [rating, setRating] = useState(testimonial?.rating || 5);
  const [imageUrl, setImageUrl] = useState(testimonial?.image_url || '');
  const [isFeatured, setIsFeatured] = useState(testimonial?.is_featured || false);
  const [isPublished, setIsPublished] = useState(testimonial?.is_published || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name,
        role,
        content,
        rating,
        image_url: imageUrl || null,
        is_featured: isFeatured,
        is_published: isPublished,
        created_by: userId,
      };

      if (testimonial) {
        const { error } = await supabase.from('testimonials').update(data).eq('id', testimonial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('testimonials').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      toast({ title: 'Success', description: 'Testimonial saved' });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{testimonial ? 'Edit' : 'Add'} Testimonial</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rating (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
              />
            </div>
            <ImageUrlInput
              label="Image"
              value={imageUrl}
              onChange={setImageUrl}
              folder="testimonials"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              <Label>Featured</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <Label>Published</Label>
            </div>
          </div>
          <Button onClick={() => saveMutation.mutate()} className="w-full">
            Save Testimonial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
