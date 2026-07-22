import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Base64 encoded transparent 1x1 pixel GIF
const PIXEL_BASE64 = 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const PIXEL_BUFFER = Buffer.from(PIXEL_BASE64, 'base64');

export async function GET(
    request: Request,
    context: { params: Promise<{ emailId: string }> }
) {
    const { emailId } = await context.params;

    // We do not await this immediately to keep the pixel response extremely fast.
    trackEmailOpen(request, emailId).catch(err => {
        console.error('Failed to track email open:', err);
    });

    // Return the transparent 1x1 pixel GIF immediately
    return new NextResponse(PIXEL_BUFFER, {
        status: 200,
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        }
    });
}

// Fire-and-forget background tracking
async function trackEmailOpen(request: Request, emailId: string) {
    // 2. Extract metadata safely
    const userAgent = request.headers.get('user-agent') || 'unknown';
    // 'x-forwarded-for' is common in proxies/Vercel
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    try {
        // 3. Insert tracking event
        await prisma.$executeRaw`
            INSERT INTO email_tracking_events (email_id, event_type, user_agent, ip_address)
            VALUES (CAST(${emailId} AS UUID), 'open', ${userAgent}, ${ipAddress})
        `;
    } catch (eventError) {
        console.error('Email tracking event insert error:', eventError);
        return; // Don't try to bump the counter if insert failed (could be invalid email_id)
    }

    try {
        // 4. Update the email's statistics (atomically increment open count)
        const emails: any[] = await prisma.$queryRaw`SELECT open_count FROM emails WHERE id = CAST(${emailId} AS UUID)`;
        const emailData = emails[0];

        if (emailData) {
            const openedAt = new Date().toISOString();
            const openCount = (emailData.open_count || 0) + 1;
            await prisma.$executeRaw`
                UPDATE emails
                SET opened_at = CAST(${openedAt} AS TIMESTAMPTZ),
                    open_count = ${openCount}
                WHERE id = CAST(${emailId} AS UUID)
            `;
        }
    } catch (updateError) {
        console.error('Email stats update error:', updateError);
    }
}
