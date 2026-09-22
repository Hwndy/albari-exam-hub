import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  user_ids?: string[];
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    const { data: caller } = token ? await supabase.auth.getUser(token) : { data: null };
    const { data: isAdmin } = caller?.user
      ? await supabase.rpc('has_role', { _user_id: caller.user.id, _role: 'admin' })
      : { data: false };
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Administrator access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_ids, title, body, url, data }: PushNotificationRequest = await req.json();

    console.log('Sending push notifications:', { user_ids, title });

    // Get push subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    
    if (user_ids && user_ids.length > 0) {
      query = query.in('user_id', user_ids);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No subscriptions found',
          sent: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} push subscriptions`);

    // Note: Web Push requires VAPID keys which should be configured
    // For now, we'll log and return success - actual push would need:
    // 1. VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets
    // 2. web-push library or manual crypto implementation
    
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admissions@albari.com.ng';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('VAPID keys not configured - push notifications disabled');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'VAPID keys not configured - notifications queued but not sent',
          sent: 0,
          queued: subscriptions.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Build the notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: '/albari_logo.jpg',
      badge: '/albari_logo.jpg',
      url: url || '/',
      data: data || {},
      timestamp: new Date().toISOString(),
    });

    let successCount = 0;
    let failedCount = 0;

    // In a production environment, you would use the web-push library
    // or implement the Web Push protocol manually
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        successCount++;
      } catch (pushError) {
        console.error(`Failed to send push to user ${sub.user_id}:`, pushError);
        failedCount++;
      }
    }

    console.log(`Push notifications sent: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failedCount,
        message: `Push notifications processed: ${successCount} sent, ${failedCount} failed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
