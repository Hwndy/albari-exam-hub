import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, ArrowLeft, Search } from 'lucide-react';
import { useNews, useNewsArticle } from '@/hooks/useCms';

const CATEGORIES = ['all', 'news', 'events', 'announcements'] as const;
type Cat = typeof CATEGORIES[number];

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

const NewsList: React.FC = () => {
  const [cat, setCat] = useState<Cat>('all');
  const [q, setQ] = useState('');
  const { data: items = [], isLoading } = useNews(cat === 'all' ? {} : { category: cat });

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const needle = q.toLowerCase();
    return items.filter((i) =>
      i.title.toLowerCase().includes(needle) ||
      (i.excerpt || '').toLowerCase().includes(needle)
    );
  }, [items, q]);

  return (
    <div className="space-y-0">
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">News & Events</Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              Stay Updated
              <span className="text-primary block">Latest News</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Keep up with the latest happenings, events, and announcements at Al-Bari Group of Schools.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 border-b border-border">
        <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button key={c} size="sm" variant={cat === c ? 'default' : 'outline'} onClick={() => setCat(c)} className="capitalize">
                {c}
              </Button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles..." className="pl-9" />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>No articles found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((item) => (
                <Link key={item.id} to={`/website/news/${item.slug}`}>
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
                      {item.featured_image ? (
                        <img src={item.featured_image} alt={item.title} loading="lazy"
                             className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <Calendar className="h-12 w-12 text-primary" />
                      )}
                    </div>
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="default" className="capitalize">{item.category}</Badge>
                        <span className="text-sm text-muted-foreground">{formatDate(item.event_date || item.published_at)}</span>
                      </div>
                      <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4 line-clamp-3">{item.excerpt}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const NewsDetail: React.FC<{ slug: string }> = ({ slug }) => {
  const { data: article, isLoading } = useNewsArticle(slug);
  const { data: related = [] } = useNews({ limit: 3 });

  if (isLoading) return <div className="container mx-auto px-4 py-24 text-center text-muted-foreground">Loading...</div>;
  if (!article) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="text-3xl font-bold">Article not found</h1>
        <Button asChild><Link to="/website/news"><ArrowLeft className="mr-2 h-4 w-4" />Back to news</Link></Button>
      </div>
    );
  }

  return (
    <article className="space-y-0">
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/website/news"><ArrowLeft className="mr-2 h-4 w-4" />All news</Link>
          </Button>
          <Badge className="mb-4 capitalize">{article.category}</Badge>
          <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4">{article.title}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" /> {formatDate(article.event_date || article.published_at)}
          </p>
        </div>
      </section>

      {article.featured_image && (
        <section className="container mx-auto px-4 -mt-6">
          <div className="max-w-4xl mx-auto aspect-video overflow-hidden rounded-2xl border border-border shadow-lg">
            <img src={article.featured_image} alt={article.title} className="h-full w-full object-cover" />
          </div>
        </section>
      )}

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl prose prose-neutral dark:prose-invert">
          {article.excerpt && <p className="lead text-lg text-muted-foreground">{article.excerpt}</p>}
          {article.content && (
            <div className="mt-6 whitespace-pre-wrap text-foreground/90 leading-relaxed"
                 dangerouslySetInnerHTML={{ __html: article.content }} />
          )}
        </div>
      </section>

      {related.filter((r) => r.id !== article.id).length > 0 && (
        <section className="py-12 bg-card/30 border-t border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Related</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.filter((r) => r.id !== article.id).slice(0, 3).map((r) => (
                <Link key={r.id} to={`/website/news/${r.slug}`} className="block rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                  <Badge variant="secondary" className="capitalize mb-2">{r.category}</Badge>
                  <p className="font-semibold text-foreground line-clamp-2">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(r.published_at)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
};

export const NewsPage = () => {
  const { slug } = useParams();
  return slug ? <NewsDetail slug={slug} /> : <NewsList />;
};
