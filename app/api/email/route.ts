// app/api/email/route.ts
// ══════════════════════════════════════════════════════════════════════════════
// Universal Email API Route
// Supports:
// - typed template emails
// - raw html emails
// - Resend delivery
// - dev logging fallback
// ══════════════════════════════════════════════════════════════════════════════
// app/api/email/route.ts

import { NextRequest, NextResponse } from 'next/server';

import {
  mealEmailTemplate,
  hydrationNudgeTemplate,
  dailyDigestTemplate,
  milestoneTemplate,
  marketReminderTemplate,
} from '../../lib/email';

export const runtime = 'nodejs';

interface EmailPayload {
  to: string;

  // typed emails
  type?: string;
  data?: any;

  // raw emails
  subject?: string;
  html?: string;

  from?: string;
  replyTo?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EmailPayload;

    const {
      to,
      type,
      data,
      subject,
      html,
      from,
      replyTo,
    } = body;

    let finalSubject = subject;
    let finalHtml = html;

    // ─────────────────────────────────────────────
    // TEMPLATE BUILDING
    // ─────────────────────────────────────────────

    switch (type) {
      case 'meal': {
        const built = mealEmailTemplate(data);
        finalSubject = built.subject;
        finalHtml = built.html;
        break;
      }

      case 'hydration': {
        const built = hydrationNudgeTemplate(data);
        finalSubject = built.subject;
        finalHtml = built.html;
        break;
      }

      case 'digest': {
        const built = dailyDigestTemplate(data);
        finalSubject = built.subject;
        finalHtml = built.html;
        break;
      }

      case 'milestone': {
        const built = milestoneTemplate(data);
        finalSubject = built.subject;
        finalHtml = built.html;
        break;
      }

      case 'market_reminder': {
        const built = marketReminderTemplate(data);
        finalSubject = built.subject;
        finalHtml = built.html;
        break;
      }

      case 'raw':
      default:
        break;
    }

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────

    if (!to || !finalSubject || !finalHtml) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
        },
        {
          status: 400,
        }
      );
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!validEmail.test(to)) {
      return NextResponse.json(
        {
          error: 'Invalid email address',
        },
        {
          status: 400,
        }
      );
    }

    // ─────────────────────────────────────────────
    // ENV
    // ─────────────────────────────────────────────

    const apiKey = process.env.RESEND_API_KEY;

    const sender =
      from ??
      process.env.EMAIL_FROM ??
      'BuBu NourishSelect <onboarding@resend.dev>';

    // ─────────────────────────────────────────────
    // DEV MODE
    // ─────────────────────────────────────────────

    if (!apiKey) {
      console.log('\n📧 EMAIL DEV MODE');
      console.log('━━━━━━━━━━━━━━━━━━━━');
      console.log('To:', to);
      console.log('Subject:', finalSubject);
      console.log('Type:', type ?? 'raw');
      console.log('━━━━━━━━━━━━━━━━━━━━\n');

      return NextResponse.json({
        success: true,
        dev: true,
      });
    }

    // ─────────────────────────────────────────────
    // RESEND
    // ─────────────────────────────────────────────

    const resendPayload: Record<string, unknown> = {
      from: sender,
      to: [to],
      subject: finalSubject,
      html: finalHtml,
    };

    if (replyTo) {
      resendPayload.reply_to = replyTo;
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('[RESEND ERROR]', resendData);

      return NextResponse.json(
        {
          error: resendData?.message ?? 'Resend failed',
        },
        {
          status: resendRes.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      id: resendData?.id,
    });

  } catch (error) {
    console.error('[EMAIL ROUTE ERROR]', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    provider: process.env.RESEND_API_KEY ? 'resend' : 'dev-mode',
  });
}