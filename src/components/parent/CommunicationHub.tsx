import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Bell, Megaphone, Calendar, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sanitizeHtml } from '@/lib/sanitize';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  publish_date: string;
  expire_date: string;
  target_audience: string[];
  attachments: any;
  created_by: string;
}

export const CommunicationHub = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunications();
  }, [user?.id]);

  const fetchCommunications = async () => {
    if (!user?.id) return;

    try {
      // Fetch published announcements targeted to parents or all
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          priority,
          publish_date,
          expire_date,
          target_audience,
          attachments,
          created_by
        `)
        .eq('is_published', true)
        .order('publish_date', { ascending: false });

      if (announcementsError) {
        console.error('Error fetching announcements:', announcementsError);
        toast({
          title: 'Error',
          description: 'Failed to load announcements',
          variant: 'destructive',
        });
        return;
      }

      setAnnouncements(announcementsData || []);
    } catch (error) {
      console.error('Error in fetchCommunications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load communications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'normal':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4" />;
      case 'high':
        return <Bell className="h-4 w-4" />;
      default:
        return <Megaphone className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const urgentAnnouncements = announcements.filter(a => a.priority === 'urgent');
  const regularAnnouncements = announcements.filter(a => a.priority !== 'urgent');

  return (
    <div className="space-y-6">
      {/* Urgent Notifications */}
      {urgentAnnouncements.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Urgent Notifications
            </CardTitle>
            <CardDescription className="text-red-600">
              Important messages requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {urgentAnnouncements.map((announcement) => (
              <div key={announcement.id} className="p-4 bg-white border rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-red-700">{announcement.title}</h3>
                  <Badge variant="destructive">URGENT</Badge>
                </div>
                <div 
                  className="text-sm text-gray-700 mb-3"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.content) }}
                />
                         <div className="flex justify-between items-center text-xs text-gray-500">
                           <span>From School Admin</span>
                           <span>{new Date(announcement.publish_date).toLocaleDateString()}</span>
                         </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Communication Tabs */}
      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="announcements">
            <Megaphone className="h-4 w-4 mr-2" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>School Announcements</CardTitle>
              <CardDescription>
                General announcements and updates from the school
              </CardDescription>
            </CardHeader>
            <CardContent>
              {regularAnnouncements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No announcements available
                </p>
              ) : (
                <div className="space-y-4">
                  {regularAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{announcement.title}</h3>
                           <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <span>From School Admin</span>
                             <span>•</span>
                             <span>{new Date(announcement.publish_date).toLocaleDateString()}</span>
                             {announcement.expire_date && (
                               <>
                                 <span>•</span>
                                 <span className="flex items-center gap-1">
                                   <Clock className="h-3 w-3" />
                                   Expires: {new Date(announcement.expire_date).toLocaleDateString()}
                                 </span>
                               </>
                             )}
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityBadgeVariant(announcement.priority)}>
                            <span className="flex items-center gap-1">
                              {getPriorityIcon(announcement.priority)}
                              {announcement.priority}
                            </span>
                          </Badge>
                        </div>
                      </div>
                      
                      <div 
                        className="text-sm text-muted-foreground mb-3"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.content) }}
                      />
                      
                      {announcement.target_audience && announcement.target_audience.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Target:</span>
                          {announcement.target_audience.map((audience) => (
                            <Badge key={audience} variant="outline" className="text-xs">
                              {audience}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {announcement.attachments && Object.keys(announcement.attachments).length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Attachments:</p>
                          <Button variant="outline" size="sm">
                            View Attachments
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Direct Messages</CardTitle>
              <CardDescription>
                Personal messages from teachers and school staff
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Messages</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any direct messages yet.
                </p>
                <Button variant="outline">
                  Compose Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Notifications</CardTitle>
              <CardDescription>
                Automated notifications about grades, attendance, and fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
                <p className="text-muted-foreground mb-4">
                  All caught up! No new notifications.
                </p>
                <Button variant="outline">
                  Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};