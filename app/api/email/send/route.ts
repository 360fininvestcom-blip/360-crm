import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { injectTracking } from '@/lib/email-tracking';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const user = session.user;

  try {
    const { to, subject, body_html, account_id } = await request.json();

    if (!to || !subject || !body_html || !account_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch account details
    const account = await prisma.smtpConfig.findUnique({
      where: { id: account_id }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Decrypt credentials
    const password = decrypt(account.passwordEncrypted);

    // 1. Create Email Record first to get the ID for tracking
    // We don't have an `Email` model in prisma, so using raw SQL for `emails` table.
    const emailId = uuidv4();
    const receivedAt = new Date().toISOString();

    await prisma.$executeRaw`
      INSERT INTO emails (id, account_id, organization_id, from_addr, to_addr, subject, body_html, folder, is_read, received_at)
      VALUES (
        CAST(${emailId} AS UUID), 
        CAST(${account.id} AS UUID), 
        CAST(${account.organizationId} AS UUID), 
        ${account.fromEmail || account.username}, 
        ${to}, 
        ${subject}, 
        ${body_html}, 
        'sent', 
        true, 
        CAST(${receivedAt} AS TIMESTAMPTZ)
      )
    `;

    // 2. Inject Tracking
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const trackedBody = injectTracking(body_html, emailId, baseUrl);

    // Update the record with tracked body
    await prisma.$executeRaw`
      UPDATE emails 
      SET body_html = ${trackedBody} 
      WHERE id = CAST(${emailId} AS UUID)
    `;

    // 3. Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: account.host,
      port: account.port,
      secure: account.port === 465,
      auth: {
        user: account.username,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 4. Send email
    await transporter.sendMail({
      from: `"${account.fromName || account.username}" <${account.fromEmail || account.username}>`,
      to,
      subject,
      html: trackedBody,
    });

    // Also Log Activity
    await prisma.activity.create({
      data: {
        organizationId: account.organizationId,
        type: 'email',
        title: `Sent Email: ${subject}`,
        description: `Sent to ${to}`,
        createdById: user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email send failed details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      command: error.command
    });

    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Check SMTP username/password.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. Check SMTP Host/Port.';
    } else if (error.response) {
      errorMessage = `SMTP Error: ${error.response}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
