import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/crypto';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { accountSid, authToken, fromNumber, isActive, orgId } = payload;

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Ensure user belongs to the org and is admin
        const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id, role")
            .eq("user_id", user.id)
            .single();

        if (!profile || profile.organization_id !== orgId || profile.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized or not admin" }, { status: 403 });
        }

        // Upsert logic
        const { data: existing } = await supabase
            .from('twilio_configs')
            .select('id, auth_token_encrypted')
            .eq('organization_id', orgId)
            .single();

        let finalAuthToken = existing?.auth_token_encrypted || '';
        if (authToken) {
            finalAuthToken = encrypt(authToken);
        }

        const configData = {
            organization_id: orgId,
            account_sid: accountSid,
            auth_token_encrypted: finalAuthToken,
            from_number: fromNumber,
            is_active: isActive,
            updated_at: new Date().toISOString()
        };

        if (existing) {
            const { error } = await supabase
                .from('twilio_configs')
                .update(configData)
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            if (!authToken) {
                 return NextResponse.json({ error: "Auth token required for new setup" }, { status: 400 });
            }
            const { error } = await supabase
                .from('twilio_configs')
                .insert([configData]);
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Twilio config error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
