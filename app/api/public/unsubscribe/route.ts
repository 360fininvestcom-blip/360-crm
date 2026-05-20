import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const org = searchParams.get('org');

    if (!email || !org) {
        return new NextResponse('Invalid unsubscribe link', { status: 400 });
    }

    try {
        const supabase = getSupabaseAdmin();
        
        // Update contact as unsubscribed
        await supabase
            .from('contacts')
            .update({ unsubscribed: true })
            .eq('email', email)
            .eq('organization_id', org);

        return new NextResponse(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Unsubscribed</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 10% 20px; background-color: #fafafa; color: #333; }
                        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                        h2 { color: #111; margin-top: 0; }
                        p { color: #555; line-height: 1.5; }
                        .icon { font-size: 48px; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">✅</div>
                        <h2>Successfully Unsubscribed</h2>
                        <p><strong>${email}</strong> has been removed from this mailing list.</p>
                        <p>You will no longer receive automated marketing emails from this sender.</p>
                    </div>
                </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// Support for standard RFC 8058 List-Unsubscribe-Post
export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const org = searchParams.get('org');

    if (!email || !org) {
        return new NextResponse('Invalid unsubscribe link', { status: 400 });
    }

    try {
        const supabase = getSupabaseAdmin();
        await supabase
            .from('contacts')
            .update({ unsubscribed: true })
            .eq('email', email)
            .eq('organization_id', org);

        return new NextResponse('Unsubscribed successfully', { status: 200 });
    } catch (error) {
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
