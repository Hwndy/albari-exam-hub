import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSchoolQuery } from '@/hooks/useSchoolQuery';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { NewsEditor } from './NewsEditor';
import type { NewsArticle } from '@/types/website';

export const NewsManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { withSchoolFilter } = useSchoolQuery();

  const { data: articles, isLoading } = useQuery({
    queryKey: ['news-articles'],
    queryFn: async () => {
      const query = supabase
        .from('news_articles')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data, error } = await withSchoolFilter(query);
      if (error) throw error;
      return data as NewsArticle[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('news_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-articles'] });
      toast({ title: 'Success', description: 'Article deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete article', variant: 'destructive' });
    },
  });

  const filteredArticles = articles?.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedArticle(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (article: NewsArticle) => {
    setSelectedArticle(article);
    setIsEditorOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isEditorOpen) {
    return (
      <NewsEditor
        article={selectedArticle}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedArticle(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>News & Articles</CardTitle>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Article
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredArticles && filteredArticles.length > 0 ? (
            <div className="grid gap-4">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{article.title}</h3>
                          <Badge variant={article.is_published ? 'default' : 'secondary'}>
                            {article.is_published ? 'Published' : 'Draft'}
                          </Badge>
                          <Badge variant="outline">{article.category}</Badge>
                        </div>
                        {article.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{new Date(article.created_at).toLocaleDateString()}</span>
                          {article.published_at && (
                            <span>Published: {new Date(article.published_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {article.is_published && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/website/news/${article.slug}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(article)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(article.id)}
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
              No articles found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
