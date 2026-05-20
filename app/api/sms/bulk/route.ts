import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { message, contactIds, isSelectAllMatching, filters } = payload;

        if (!message) {
            return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
        }

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

        const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("user_id", user.id)
            .single();

        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const orgId = profile.organization_id;

        // Check if Twilio config exists
        const { data: twilioConfig } = await supabase
            .from('twilio_configs')
            .select('id')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .single();

        if (!twilioConfig) {
            return NextResponse.json({ error: 'Please configure Twilio settings in Integrations before sending bulk SMS.' }, { status: 400 });
        }

        // Resolve Contacts
        let contacts: { id: string, phone: string, first_name: string, last_name: string, organization_id: string }[] = [];

        if (isSelectAllMatching) {
            let query = supabase
                .from('contacts')
                .select('id, phone, first_name, last_name, organization_id')
                .eq('organization_id', orgId);
                
            if (filters?.search) {
                query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
            }
            if (filters?.status && filters.status !== "all") {
                query = query.eq('status', filters.status);
            }
            if (filters?.ownerId && filters.ownerId !== "all") {
                query = query.eq('owner_id', filters.ownerId);
            }

            const { data, error } = await query;
            if (error) throw error;
            contacts = data || [];
        } else {
            if (!contactIds || contactIds.length === 0) {
                return NextResponse.json({ error: 'No contacts specified' }, { status: 400 });
            }
            const { data, error } = await supabase
                .from('contacts')
                .select('id, phone, first_name, last_name, organization_id')
                .in('id', contactIds)
                .eq('organization_id', orgId);

            if (error) throw error;
            contacts = data || [];
        }

        contacts = contacts.filter(c => !!c.phone);

        if (contacts.length === 0) {
            return NextResponse.json({ error: 'No selected contacts have valid phone numbers.' }, { status: 400 });
        }

        const queuePayloads = contacts.map(contact => {
            let finalMessage = message;
            
            const variables: Record<string, string> = {
                first_name: contact.first_name || 'there',
                last_name: contact.last_name || ''
            };

            Object.entries(variables).forEach(([key, value]) => {
                const placeholder = new RegExp(`{{${key}}}`, 'g');
                finalMessage = finalMessage.replace(placeholder, value);
            });

            return {
                organization_id: orgId,
                to_phone: contact.phone,
                message: finalMessage,
                contact_id: contact.id,
                status: 'pending'
            };
        });

        if (queuePayloads.length > 0) {
            const { error: insertError } = await supabase.from('sms_queue').insert(queuePayloads);
            if (insertError) {
                console.error("SMS Queue insert error:", insertError);
                throw insertError;
            }
        }

        return NextResponse.json({ success: true, queuedCount: queuePayloads.length });
    } catch (error) {
        console.error('Bulk SMS error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
