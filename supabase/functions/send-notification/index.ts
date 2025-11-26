import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
  priority?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: NotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine target users
    const targetUsers = notification.userIds || (notification.userId ? [notification.userId] : []);
    
    if (targetUsers.length === 0) {
      throw new Error('Nenhum destinatário especificado');
    }

    // Check quiet hours for each user
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .in('user_id', targetUsers);

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    const notificationsToCreate = [];

    for (const userId of targetUsers) {
      const userSettings = settings?.find(s => s.user_id === userId);
      
      // Check if user has notifications enabled
      if (userSettings && !userSettings.push_enabled) {
        console.log(`Notificações desabilitadas para usuário ${userId}`);
        continue;
      }

      // Check quiet hours
      if (userSettings?.quiet_hours_start && userSettings?.quiet_hours_end) {
        const start = userSettings.quiet_hours_start;
        const end = userSettings.quiet_hours_end;
        
        if (currentTime >= start && currentTime <= end) {
          console.log(`Usuário ${userId} está em horário de silêncio`);
          continue;
        }
      }

      // Check category preferences
      if (userSettings?.categories_enabled && notification.type) {
        if (!userSettings.categories_enabled.includes(notification.type)) {
          console.log(`Categoria ${notification.type} desabilitada para usuário ${userId}`);
          continue;
        }
      }

      notificationsToCreate.push({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'general',
        action_url: notification.actionUrl,
        priority: notification.priority || 'normal',
        metadata: notification.metadata || {},
      });
    }

    if (notificationsToCreate.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma notificação enviada (filtros aplicados)',
          sent: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notifications
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationsToCreate)
      .select();

    if (error) {
      throw error;
    }

    console.log(`${data.length} notificações criadas com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: data.length,
        notifications: data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no send-notification:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
