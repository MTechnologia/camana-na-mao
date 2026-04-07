import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado', details: 'Token de autenticação ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Erro de configuração' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado', details: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[export-user-data] Exporting data for user: ${user.id}`);

    // Collect all user data
    const exportData: Record<string, unknown> = {
      metadata: {
        export_date: new Date().toISOString(),
        user_id: user.id,
        format_version: '1.0',
      },
      account: {},
      profile: {},
      demographics: {},
      addresses: [],
      interests: [],
      preferences: {},
      consents: [],
      reports: {
        urban: [],
        transport: [],
      },
      ratings: [],
      conversations: [],
      participations: [],
    };

    // 1. Account data (from auth.users)
    exportData.account = {
      email: user.email,
      email_verified: user.email_confirmed_at ? true : false,
      phone: user.phone,
      phone_verified: user.phone_confirmed_at ? true : false,
      created_at: user.created_at,
      last_sign_in: user.last_sign_in_at,
    };

    // 2. Profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileError && profile) {
      exportData.profile = {
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
    }

    // 3. Demographics
    const { data: demographics, error: demographicsError } = await supabase
      .from('user_demographics')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!demographicsError && demographics) {
      exportData.demographics = {
        birth_date: demographics.birth_date,
        gender: demographics.gender,
        race: demographics.race,
        social_class: demographics.social_class,
        created_at: demographics.created_at,
        updated_at: demographics.updated_at,
      };
    }

    // 4. Addresses
    const { data: addresses, error: addressesError } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!addressesError && addresses) {
      exportData.addresses = addresses.map(addr => ({
        street: addr.street,
        number: addr.number,
        complement: addr.complement,
        neighborhood: addr.neighborhood,
        city: addr.city,
        state: addr.state,
        zip_code: addr.zip_code,
        is_primary: addr.is_primary,
        created_at: addr.created_at,
        updated_at: addr.updated_at,
      }));
    }

    // 5. Interests
    const { data: interests, error: interestsError } = await supabase
      .from('user_interests')
      .select('interest_category')
      .eq('user_id', user.id);

    if (!interestsError && interests) {
      exportData.interests = interests.map(i => i.interest_category);
    }

    // 6. Preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!preferencesError && preferences) {
      exportData.preferences = {
        profile_visibility: preferences.profile_visibility,
        show_email: preferences.show_email,
        show_phone: preferences.show_phone,
        push_notifications: preferences.push_notifications,
        email_notifications: preferences.email_notifications,
        sms_notifications: preferences.sms_notifications,
        newsletter: preferences.newsletter,
        visit_detection_enabled: preferences.visit_detection_enabled,
        updated_at: preferences.updated_at,
      };
    }

    // 7. Notification settings
    const { data: notifSettings, error: notifError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!notifError && notifSettings) {
      exportData.preferences.notification_settings = {
        push_enabled: notifSettings.push_enabled,
        email_enabled: notifSettings.email_enabled,
        sms_enabled: notifSettings.sms_enabled,
        newsletter_enabled: notifSettings.newsletter_enabled,
        categories_enabled: notifSettings.categories_enabled,
        quiet_hours_start: notifSettings.quiet_hours_start,
        quiet_hours_end: notifSettings.quiet_hours_end,
      };
    }

    // 8. Consents
    const { data: consents, error: consentsError } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id)
      .order('granted_at', { ascending: false });

    if (!consentsError && consents) {
      exportData.consents = consents.map(consent => ({
        consent_type: consent.consent_type,
        granted: consent.granted,
        granted_at: consent.granted_at,
        revoked_at: consent.revoked_at,
        version: consent.version,
      }));
    }

    // 9. Urban Reports
    const { data: urbanReports, error: urbanError } = await supabase
      .from('urban_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!urbanError && urbanReports) {
      exportData.reports.urban = urbanReports.map(report => ({
        id: report.id,
        problem_type: report.problem_type,
        description: report.description,
        location: report.location ? {
          address: report.location.address,
          coordinates: report.location.coordinates,
        } : null,
        status: report.status,
        created_at: report.created_at,
        updated_at: report.updated_at,
      }));
    }

    // 10. Transport Reports
    const { data: transportReports, error: transportError } = await supabase
      .from('transport_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!transportError && transportReports) {
      exportData.reports.transport = transportReports.map(report => ({
        id: report.id,
        line: report.line,
        direction: report.direction,
        issue_type: report.issue_type,
        description: report.description,
        location: report.location ? {
          address: report.location.address,
          coordinates: report.location.coordinates,
        } : null,
        status: report.status,
        created_at: report.created_at,
        updated_at: report.updated_at,
      }));
    }

    // 11. Service Ratings
    const { data: ratings, error: ratingsError } = await supabase
      .from('service_ratings')
      .select(`
        *,
        service:public_services(
          id,
          name,
          service_type,
          address,
          district
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!ratingsError && ratings) {
      exportData.ratings = ratings.map(rating => ({
        id: rating.id,
        rating_stars: rating.rating_stars,
        rating_text: rating.rating_text,
        sentiment: rating.sentiment,
        is_anonymous: rating.is_anonymous,
        service_name: rating.service?.name || null,
        service_type: rating.service?.service_type || null,
        service_address: rating.service?.address || null,
        service_district: rating.service?.district || null,
        created_at: rating.created_at,
        updated_at: rating.updated_at,
      }));
    }

    // 12. Conversations (AI chat history)
    const { data: conversations, error: conversationsError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100); // Limitar a 100 últimas conversas

    if (!conversationsError && conversations) {
      exportData.conversations = conversations.map(conv => ({
        id: conv.id,
        messages_count: conv.messages_count,
        intent_detected: conv.intent_detected,
        tools_called: conv.tools_called,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
      }));
    }

    // 13. Audiência Participations
    const { data: participations, error: participationsError } = await supabase
      .from('audiencia_participations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!participationsError && participations) {
      exportData.participations = participations.map(part => ({
        id: part.id,
        audiencia_id: part.audiencia_id,
        status: part.status,
        interests: part.interests,
        created_at: part.created_at,
        updated_at: part.updated_at,
      }));
    }

    // 14. Council Member Referrals
    const { data: referrals, error: referralsError } = await supabase
      .from('council_member_referrals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!referralsError && referrals) {
      exportData.referrals = referrals.map(ref => ({
        id: ref.id,
        council_member_id: ref.council_member_id,
        report_type: ref.report_type,
        report_id: ref.report_id,
        status: ref.status,
        created_at: ref.created_at,
        updated_at: ref.updated_at,
      }));
    }

    console.log(`[export-user-data] Export completed for user: ${user.id}`);

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="dados-pessoais-${user.id}-${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );
  } catch (error: unknown) {
    console.error('[export-user-data] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao exportar dados', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
