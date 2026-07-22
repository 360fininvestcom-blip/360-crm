import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(
    request: Request,
    context: { params: Promise<{ emailId: string }> }
) {
    const { emailId } = await context.params;
    const url = new URL(request.url);
    const destinationUrl = url.searchParams.get('url');

    if (!destinationUrl) {
        return NextResponse.json({ error: 'Missing destination URL' }, { status: 400 });
    }

    // Fire and forget tracking logic
    trackEmailClick(request, emailId, destinationUrl).catch(err => {
        console.error('Failed to track email click:', err);
    });

    // Determine fallback
    let decodedUrl = '';
    try {
        decodedUrl = decodeURIComponent(destinationUrl);
        // Basic safety check for http/https to prevent javascript: or internal protocol injection
        if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
            decodedUrl = 'https://' + decodedUrl;
        }
    } catch {
        decodedUrl = process.env.NEXT_PUBLIC_APP_URL || '/';
    }

    // Redirect the user immediately
    return NextResponse.redirect(decodedUrl, 302);
}

// Async background tracking function
async function trackEmailClick(request: Request, emailId: string, destinationUrl: string) {
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    try {
        // Log the click event
        await prisma.$executeRaw`
            INSERT INTO email_tracking_events (email_id, event_type, link_url, user_agent, ip_address)
            VALUES (CAST(${emailId} AS UUID), 'click', ${destinationUrl}, ${userAgent}, ${ipAddress})
        `;
    } catch (eventError) {
        console.error('Click tracking event insert error:', eventError);
        return;
    }

    try {
        // Update email click counters
        const emails: any[] = await prisma.$queryRaw`SELECT click_count FROM emails WHERE id = CAST(${emailId} AS UUID)`;
        const emailData = emails[0];

        if (emailData) {
            const clickedAt = new Date().toISOString();
            const clickCount = (emailData.click_count || 0) + 1;
            await prisma.$executeRaw`
                UPDATE emails
                SET clicked_at = CAST(${clickedAt} AS TIMESTAMPTZ),
                    click_count = ${clickCount}
                WHERE id = CAST(${emailId} AS UUID)
            `;
        }
    } catch (updateError) {
        console.error('Email stats update error:', updateError);
    }
}
