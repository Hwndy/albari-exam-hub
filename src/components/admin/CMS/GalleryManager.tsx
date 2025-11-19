import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';
import { Plus, Trash2, Edit, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { GalleryItem } from '@/types/website';

export const GalleryManager = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { withSchoolFilter } = useSchoolQuery();

  const { data: galleryItems, isLoading } = useQuery({
    queryKey: ['gallery', selectedCategory],
    queryFn: async () => {
      let query = supabase.from('gallery').select('*').order('display_order', { ascending: true });
      
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error } = await withSchoolFilter(query);
      if (error) throw error;
      return data as GalleryItem[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      toast({ title: 'Success', description: 'Image deleted successfully' });
    },
  });

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gallery Manager</CardTitle>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Image
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Label>Filter by Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="facilities">Facilities</SelectItem>
                <SelectItem value="events">Events</SelectItem>
                <SelectItem value="activities">Activities</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : galleryItems && galleryItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryItems.map((item) => (
                <Card key={item.id} className="overflow-hidden group">
                  <div className="aspect-square relative">
                    <img
                      src={item.image_url}
                      alt={item.alt_text || item.title}
                      className="w-full h-full object-cover"
                    />
                    {item.is_featured && (
                      <div className="absolute top-2 right-2">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this image?')) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm truncate">{item.title}</h4>
                    <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No images found
            </div>
          )}
        </CardContent>
      </Card>

      <GalleryItemDialog
        item={editingItem}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        userId={user?.id || ''}
      />
    </div>
  );
};

interface GalleryItemDialogProps {
  item: GalleryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const GalleryItemDialog = ({ item, open, onOpenChange, userId }: GalleryItemDialogProps) => {
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [category, setCategory] = useState(item?.category || 'general');
  const [altText, setAltText] = useState(item?.alt_text || '');
  const [isFeatured, setIsFeatured] = useState(item?.is_featured || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { withSchoolData } = useSchoolQuery();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const itemData = withSchoolData({
        title,
        description: description || null,
        image_url: imageUrl,
        category,
        alt_text: altText || null,
        is_featured: isFeatured,
        display_order: item?.display_order || 1,
        created_by: userId,
      });

      if (item) {
        const { error } = await supabase.from('gallery').update(itemData).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('gallery').insert(itemData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      toast({ title: 'Success', description: 'Image saved successfully' });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Image' : 'Add New Image'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Image URL *</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facilities">Facilities</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="activities">Activities</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input value={altText} onChange={(e) => setAltText(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            <Label>Featured Image</Label>
          </div>
          <Button onClick={() => saveMutation.mutate()} className="w-full">
            Save Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
