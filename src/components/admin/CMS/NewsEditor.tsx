import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { NewsArticle } from '@/types/website';
import { useAuth } from '@/contexts/AuthContext';

interface NewsEditorProps {
  article: NewsArticle | null;
  onClose: () => void;
}

export const NewsEditor = ({ article, onClose }: NewsEditorProps) => {
  const [title, setTitle] = useState(article?.title || '');
  const [slug, setSlug] = useState(article?.slug || '');
  const [excerpt, setExcerpt] = useState(article?.excerpt || '');
  const [content, setContent] = useState(article?.content || '');
  const [category, setCategory] = useState<'news' | 'events' | 'announcements'>(
    article?.category || 'news'
  );
  const [featuredImage, setFeaturedImage] = useState(article?.featured_image || '');
  const [isPublished, setIsPublished] = useState(article?.is_published || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  useEffect(() => {
    if (title && !article) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generatedSlug);
    }
  }, [title, article]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const articleData = {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        category,
        featured_image: featuredImage || null,
        is_published: isPublished,
        published_at: isPublished && !article?.is_published ? new Date().toISOString() : article?.published_at,
        created_by: user?.id || '',
      };

      if (article) {
        const { error } = await supabase
          .from('news_articles')
          .update(articleData)
          .eq('id', article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('news_articles').insert(articleData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-articles'] });
      toast({ title: 'Success', description: 'Article saved successfully' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to save article: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!title || !content || !slug) {
      toast({
        title: 'Validation Error',
        description: 'Title, slug, and content are required',
        variant: 'destructive',
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Articles
        </Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Article'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{article ? 'Edit Article' : 'Create New Article'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter article title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="article-url-slug"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="announcements">Announcements</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured-image">Featured Image URL</Label>
              <Input
                id="featured-image"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt (optional)</Label>
            <Input
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief description for previews"
            />
          </div>

          <div className="space-y-2">
            <Label>Content *</Label>
            <RichTextEditor value={content} onChange={setContent} />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="published">Publish immediately</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
