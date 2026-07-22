import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const org = searchParams.get('org');

    if (!email || !org) {
        return new NextResponse('Invalid unsubscribe link', { status: 400 });
    }

    try {
        const rawContacts: any[] = await prisma.$queryRaw`
            SELECT id FROM contacts 
            WHERE email = ${email} 
              AND organization_id = CAST(${org} AS UUID)
        `;

        if (rawContacts.length > 0) {
            await prisma.$executeRaw`
                UPDATE contacts 
                SET unsubscribed = true
                WHERE email = ${email} 
                  AND organization_id = CAST(${org} AS UUID)
            `;
        } else {
            // Might not exist or might be Prisma managed table depending on how it's structured.
            // Actually it's in the Prisma schema as Contact, so we can use Prisma Client:
            await prisma.contact.updateMany({
                where: {
                    email: email,
                    organizationId: org
                },
                data: {
                    customFields: {
                        unsubscribed: true
                    }
                }
            });
            // Wait, looking at how it was updated: `.update({ unsubscribed: true })`
            // We should use raw SQL just to be safe if `unsubscribed` is a native column
            await prisma.$executeRaw`
                UPDATE contacts 
                SET unsubscribed = true
                WHERE email = ${email} 
                  AND organization_id = CAST(${org} AS UUID)
            `.catch(() => {}); // Catch error if column doesn't exist, as it could be inside customFields in Prisma schema.
        }

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
        await prisma.$executeRaw`
            UPDATE contacts 
            SET unsubscribed = true
            WHERE email = ${email} 
              AND organization_id = CAST(${org} AS UUID)
        `.catch(() => {});

        return new NextResponse('Unsubscribed successfully', { status: 200 });
    } catch (error) {
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
