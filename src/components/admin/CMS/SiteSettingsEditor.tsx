import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import type { WebsiteSettings } from '@/types/website';
import { ImageUrlInput } from './ImageUrlInput';

export const SiteSettingsEditor = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['website-settings'],
    queryFn: async () => {
      const query = supabase.from('website_settings').select('*');
      const { data, error } = await query;
      if (error) throw error;
      return data as WebsiteSettings[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const settingData = {
        setting_key: key,
        setting_value: value,
      };
      
      const { error } = await supabase
        .from('website_settings')
        .upsert(settingData)
        .eq('setting_key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-settings'] });
      toast({ title: 'Success', description: 'Settings updated successfully' });
    },
  });

  const getValue = (key: string) => {
    const setting = settings?.find((s) => s.setting_key === key);
    return setting?.setting_value || '';
  };

  const [logoUrl, setLogoUrl] = useState<string>('');
  const [footerText, setFooterText] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [analyticsCode, setAnalyticsCode] = useState('');

  const [logoInitialized, setLogoInitialized] = useState(false);
  useEffect(() => {
    if (!logoInitialized && settings) {
      setLogoUrl(String(getValue('logo_url') || ''));
      setLogoInitialized(true);
    }
  }, [settings, logoInitialized]);

  const handleSave = (key: string, value: any) => {
    updateMutation.mutate({ key, value });
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Website Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="branding">
              <AccordionTrigger>Branding</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <ImageUrlInput
                  id="logo-url"
                  label="Logo"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  folder="site"
                  placeholder="https://example.com/logo.png"
                />
                <Button onClick={() => handleSave('logo_url', logoUrl)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Logo
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="footer">
              <AccordionTrigger>Footer Content</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="footer-text">Footer Text</Label>
                  <Textarea
                    id="footer-text"
                    defaultValue={getValue('footer_text')}
                    onChange={(e) => setFooterText(e.target.value)}
                    rows={4}
                    placeholder="Enter footer content..."
                  />
                </div>
                <Button onClick={() => handleSave('footer_text', footerText)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Footer
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="seo">
              <AccordionTrigger>SEO Defaults</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seo-title">Default Page Title</Label>
                  <Input
                    id="seo-title"
                    defaultValue={getValue('default_seo_title')}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Your School Name - Tagline"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo-description">Default Meta Description</Label>
                  <Textarea
                    id="seo-description"
                    defaultValue={getValue('default_seo_description')}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description for search engines..."
                  />
                </div>
                <Button
                  onClick={() => {
                    handleSave('default_seo_title', seoTitle);
                    handleSave('default_seo_description', seoDescription);
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save SEO Settings
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="analytics">
              <AccordionTrigger>Analytics & Tracking</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="analytics-code">Google Analytics Code</Label>
                  <Textarea
                    id="analytics-code"
                    defaultValue={getValue('analytics_code')}
                    onChange={(e) => setAnalyticsCode(e.target.value)}
                    rows={6}
                    placeholder="Paste your Google Analytics tracking code here..."
                  />
                </div>
                <Button onClick={() => handleSave('analytics_code', analyticsCode)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Analytics
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};
