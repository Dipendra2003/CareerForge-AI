import { Router } from 'express';
import prisma from '../../lib/prisma';
import { logAdminAction } from '../../utils/auditLogger';
import { sendTemplateEmail, replaceVariables } from '../../services/email/emailService';

const emailsRouter = Router();

// Define helper to generate uniform, premium responsive HTML emails
export function createEmailTemplateHtml({
  title,
  preheader,
  headline,
  body,
  ctaText,
  ctaUrl,
  otpCode,
  bentoRows,
  alertMessage,
  supportEmail = "support@careerforgeai.com"
}: {
  title: string;
  preheader?: string;
  headline: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  otpCode?: string;
  bentoRows?: { label: string; value: string }[];
  alertMessage?: string;
  supportEmail?: string;
}) {
  const bentoHtml = bentoRows && bentoRows.length > 0
    ? `<div class="bento-grid" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin: 24px 0;">
        ${bentoRows.map(row => `
          <div class="bento-row" style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 10px 0;">
            <span class="bento-label" style="font-weight: 600; color: #475569; font-size: 14px;">${row.label}</span>
            <span class="bento-value" style="color: #0f172a; font-weight: 600; font-size: 14px; text-align: right;">${row.value}</span>
          </div>
        `).join('')}
       </div>`
    : '';

  const ctaHtml = ctaText && ctaUrl
    ? `<div class="btn-container" style="margin: 32px 0; text-align: center;">
        <a class="btn" href="${ctaUrl}" style="background-color: #4f46e5; color: #ffffff !important; padding: 14px 28px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">${ctaText}</a>
       </div>`
    : '';

  const otpHtml = otpCode
    ? `<div class="otp-box" style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
        <div class="otp-code" style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a;">${otpCode}</div>
       </div>`
    : '';

  const alertHtml = alertMessage
    ? `<div class="alert-box" style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 16px; border-radius: 6px; margin: 24px 0; color: #92400e; font-size: 14px; line-height: 1.5; text-align: left;">
        ${alertMessage}
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
  ${preheader ? `<span style="display: none; max-height: 0px; overflow: hidden;">${preheader}</span>` : ''}
  <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; padding: 40px 0; border-collapse: collapse;">
    <tr>
      <td align="center">
        <table class="container" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-collapse: collapse; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);">
          <!-- Header -->
          <tr>
            <td class="header" style="background-color: #0f172a; padding: 32px; text-align: center;">
              <span class="logo" style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Resume<span class="logo-accent" style="color: #6366f1;">AI</span>
              </span>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td class="content" style="padding: 40px 32px; color: #334155; line-height: 1.6;">
              <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${headline}</h1>
              <div style="font-size: 16px; color: #475569; margin-bottom: 24px;">
                ${body}
              </div>
              ${otpHtml}
              ${bentoHtml}
              ${alertHtml}
              ${ctaHtml}
              <p style="font-size: 14px; color: #64748b; margin-top: 32px; margin-bottom: 0; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Best regards,<br><strong>The CareerForge AI Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="footer" style="padding: 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <div class="footer-links" style="margin-bottom: 16px;">
                <span style="color: #64748b; font-size: 13px; margin: 0 12px;">Resume Optimization</span>
                <span style="color: #64748b; font-size: 13px; margin: 0 12px;">•</span>
                <span style="color: #64748b; font-size: 13px; margin: 0 12px;">ATS Scanner</span>
                <span style="color: #64748b; font-size: 13px; margin: 0 12px;">•</span>
                <span style="color: #64748b; font-size: 13px; margin: 0 12px;">AI Assistant</span>
              </div>
              <p class="footer-text" style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
                &copy; 2026 CareerForge AI. All rights reserved.<br>
                This is an automated communication. If you have any questions or support issues, please contact us at <a href="mailto:${supportEmail}" style="color: #6366f1; text-decoration: none;">${supportEmail}</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Define default templates
const defaultTemplates = [
  {
    key: 'verification',
    name: 'Email Verification',
    category: 'auth',
    subject: 'Verify your CareerForge AI account',
    htmlBody: createEmailTemplateHtml({
      title: 'Verify your CareerForge AI account',
      headline: 'Verify your Email Address',
      body: 'Hi {{name}},<br><br>Thank you for signing up for CareerForge AI! To complete your registration and secure your account, please enter the following verification code or click the button below.',
      otpCode: '{{otp}}',
      ctaText: 'Verify Email',
      ctaUrl: '{{link}}'
    }),
    textBody: 'Hi {{name}},\n\nPlease verify your email using this code: {{otp}} or visit: {{link}}',
    variables: JSON.stringify(['name', 'otp', 'link'])
  },
  {
    key: 'welcome',
    name: 'Welcome Email',
    category: 'auth',
    subject: 'Welcome to CareerForge AI!',
    htmlBody: createEmailTemplateHtml({
      title: 'Welcome to CareerForge AI!',
      headline: 'Welcome to CareerForge AI, {{name}}!',
      body: 'We are absolutely thrilled to have you here. CareerForge AI is built to help job seekers bypass automated filters and match perfectly with top-tier jobs. Here is how you can jumpstart your career search today:<br><br>1. <strong>Upload Your Resume</strong> — Upload a PDF or plain text resume.<br>2. <strong>Match Job Description</strong> — Paste any job posting description.<br>3. <strong>Scan & Optimize</strong> — Get instant keyword matches, ATS feedback, and professional bullet re-writes.',
      ctaText: 'Go to Dashboard',
      ctaUrl: '/dashboard'
    }),
    textBody: 'Hi {{name}},\n\nWelcome to CareerForge AI! Get started by uploading your resume.',
    variables: JSON.stringify(['name'])
  },
  {
    key: 'forgot_password',
    name: 'Forgot Password',
    category: 'auth',
    subject: 'Reset your password',
    htmlBody: createEmailTemplateHtml({
      title: 'Reset your password',
      headline: 'Password Reset Request',
      body: 'Hi {{name}},<br><br>We received a request to reset the password associated with your CareerForge AI account. Click the button below to establish a new password. This reset link is valid for exactly 1 hour.',
      ctaText: 'Reset Password',
      ctaUrl: '{{link}}',
      alertMessage: 'If you did not authorize this request, you can safely disregard this email. Your current password remains perfectly secure.'
    }),
    textBody: 'Hi {{name}},\n\nReset your password using this link: {{link}}',
    variables: JSON.stringify(['name', 'link'])
  },
  {
    key: 'password_changed',
    name: 'Password Changed',
    category: 'auth',
    subject: 'Your password was changed',
    htmlBody: createEmailTemplateHtml({
      title: 'Your password was changed',
      headline: 'Password Successfully Updated',
      body: 'Hi {{name}},<br><br>This is a security notification confirming that the password for your CareerForge AI account has been successfully changed. If you initiated this change, no further action is necessary.',
      alertMessage: 'If you did not make this change, please contact support immediately at {{supportEmail}} to freeze your account and restore access.'
    }),
    textBody: 'Hi {{name}},\n\nYour password was recently changed. If this wasn\'t you, please contact support at {{supportEmail}}.',
    variables: JSON.stringify(['name', 'supportEmail'])
  },
  {
    key: 'subscription_success',
    name: 'Subscription Success',
    category: 'billing',
    subject: 'Thank you for your purchase!',
    htmlBody: createEmailTemplateHtml({
      title: 'Thank you for your purchase!',
      headline: 'Premium Subscription Activated',
      body: 'Hi {{name}},<br><br>Welcome to the <strong>{{planName}}</strong> Tier! Your premium subscription to CareerForge AI is now fully active. You have been granted complete, unrestricted access to our entire suite of advanced optimization tools, resume analyses, and custom cover letter generation.',
      bentoRows: [
        { label: 'Active Plan', value: '{{planName}}' },
        { label: 'Account Tier', value: 'Premium Member' },
        { label: 'Status', value: 'Active' }
      ],
      ctaText: 'Open Dashboard',
      ctaUrl: '/dashboard'
    }),
    textBody: 'Hi {{name}},\n\nYour {{planName}} subscription to CareerForge AI is now active.',
    variables: JSON.stringify(['name', 'planName'])
  },
  {
    key: 'subscription_cancelled',
    name: 'Subscription Cancelled',
    category: 'billing',
    subject: 'Subscription Cancelled',
    htmlBody: createEmailTemplateHtml({
      title: 'Subscription Cancelled',
      headline: 'Subscription Status Update',
      body: 'Hi {{name}},<br><br>We are writing to confirm that your subscription has been cancelled at your request. You will retain full access to all premium assets and tools until the end of your active billing period, after which your account will automatically transfer to our Free tier.',
      alertMessage: 'We are sad to see you go! If you have any feedback or if there is anything we can do to win you back, please reach out. You can re-activate your subscription at any time from your settings panel.'
    }),
    textBody: 'Hi {{name}},\n\nYour subscription has been cancelled and will end on your next billing date.',
    variables: JSON.stringify(['name'])
  },
  {
    key: 'contact_reply',
    name: 'Contact Reply',
    category: 'support',
    subject: 'Re: {{subject}}',
    htmlBody: createEmailTemplateHtml({
      title: 'Message Received',
      headline: 'We have received your message',
      body: 'Hi {{name}},<br><br>Thank you for contacting CareerForge AI support regarding "<strong>{{subject}}</strong>". Our technical and career support staff are actively reviewing your submission, and we will get back to you with a comprehensive answer within 24 business hours.'
    }),
    textBody: 'Hi {{name}},\n\nWe have received your message and will respond shortly.',
    variables: JSON.stringify(['name', 'subject'])
  },
  {
    key: 'admin_notification',
    name: 'Admin Notification (Contact)',
    category: 'system',
    subject: 'New Contact Form Submission: {{subject}}',
    htmlBody: createEmailTemplateHtml({
      title: 'New Support Contact Submission',
      headline: 'Admin Alert: New Support Request',
      body: 'An active user or visitor has submitted a message via the front contact form. Detailed inquiry attributes are listed below:',
      bentoRows: [
        { label: 'Sender Name', value: '{{name}}' },
        { label: 'Sender Email', value: '{{email}}' },
        { label: 'Subject', value: '{{subject}}' }
      ],
      alertMessage: '<strong>Inquiry Message:</strong><br><br>{{message}}'
    }),
    textBody: 'New Contact Submission\n\nName: {{name}}\nEmail: {{email}}\nSubject: {{subject}}\nMessage:\n{{message}}',
    variables: JSON.stringify(['name', 'email', 'subject', 'message'])
  },
  {
    key: 'trial_started',
    name: 'Free Trial Started',
    category: 'billing',
    subject: 'Your Free Trial has started!',
    htmlBody: createEmailTemplateHtml({
      title: 'Your Free Trial has started!',
      headline: 'Free Trial Activated',
      body: 'Hi {{name}},<br><br>Congratulations! Your Pro Free Trial is now active. You have full access to high-impact resume scanning and customized cover letters until your trial concludes on <strong>{{endDate}}</strong>.',
      bentoRows: [
        { label: 'Trial Period End', value: '{{endDate}}' },
        { label: 'Current Tier', value: 'Pro (Trial)' }
      ],
      ctaText: 'Start Scanning',
      ctaUrl: '/dashboard'
    }),
    textBody: 'Hi {{name}},\n\nYour free trial of CareerForge AI Pro has started! It will end on {{endDate}}.',
    variables: JSON.stringify(['name', 'endDate'])
  },
  {
    key: 'trial_ending',
    name: 'Free Trial Ending Soon',
    category: 'billing',
    subject: 'Your Free Trial is ending on {{endDate}}',
    htmlBody: createEmailTemplateHtml({
      title: 'Your Free Trial is ending soon',
      headline: 'Pro Trial Ending Soon',
      body: 'Hi {{name}},<br><br>We hope you have loved the professional scanning and bullet optimizations of CareerForge AI Pro! This is a short reminder that your free trial is ending on <strong>{{endDate}}</strong>. To continue enjoying uninterrupted premium tools, no action is required—your account will seamlessly rollover.',
      bentoRows: [
        { label: 'Ending Date', value: '{{endDate}}' },
        { label: 'Next Cycle Plan', value: 'Pro Plan' }
      ],
      ctaText: 'Review Subscription',
      ctaUrl: '/account'
    }),
    textBody: 'Hi {{name}},\n\nYour Pro trial ends on {{endDate}}. You will be billed for the next cycle.',
    variables: JSON.stringify(['name', 'endDate'])
  },
  {
    key: 'coupon_applied',
    name: 'Discount Coupon Applied',
    category: 'billing',
    subject: 'Coupon {{couponCode}} successfully applied!',
    htmlBody: createEmailTemplateHtml({
      title: 'Coupon Applied Successfully',
      headline: 'Discount Code Applied',
      body: 'Hi {{name}},<br><br>Great news! The promotional discount code <strong>{{couponCode}}</strong> has been successfully applied to your CareerForge AI billing profile. The associated adjustment will be visible on your next renewal billing statement.',
      bentoRows: [
        { label: 'Coupon Applied', value: '{{couponCode}}' },
        { label: 'Billing Status', value: 'Discount Configured' }
      ]
    }),
    textBody: 'Hi {{name}},\n\nCoupon {{couponCode}} was successfully applied to your order.',
    variables: JSON.stringify(['name', 'couponCode'])
  },
  {
    key: 'payment_failed',
    name: 'Invoice Payment Failed',
    category: 'billing',
    subject: 'Action Required: Payment failed for your subscription',
    htmlBody: createEmailTemplateHtml({
      title: 'Payment Failed',
      headline: 'Subscription Renewal Failed',
      body: 'Hi {{name}},<br><br>We were unable to process the renewal payment for your CareerForge AI plan. To avoid any potential disruption to your active ATS scans and historic reports, please take a moment to review and update your payment details.',
      alertMessage: 'Note: Stripe will automatically retry processing this payment in a few days. If the payment continues to fail, your subscription will be paused.',
      ctaText: 'Update Billing Info',
      ctaUrl: '/account'
    }),
    textBody: 'Hi {{name}},\n\nYour recent payment failed. Please update your billing info.',
    variables: JSON.stringify(['name'])
  },
  {
    key: 'invoice_generated',
    name: 'Invoice Generated',
    category: 'billing',
    subject: 'Invoice of {{amount}} for your CareerForge AI subscription',
    htmlBody: createEmailTemplateHtml({
      title: 'Invoice Generated',
      headline: 'Payment Confirmation & Invoice',
      body: 'Hi {{name}},<br><br>Your payment of <strong>${{amount}}</strong> has been successfully received and processed. Thank you for using CareerForge AI! A downloadable PDF receipt of your transaction is available below.',
      bentoRows: [
        { label: 'Amount Paid', value: '${{amount}}' },
        { label: 'Payment Status', value: 'Paid & Settled' }
      ],
      ctaText: 'Download Invoice',
      ctaUrl: '{{url}}'
    }),
    textBody: 'Hi {{name}},\n\nYour payment of ${{amount}} was successfully processed. Download invoice: {{url}}',
    variables: JSON.stringify(['name', 'amount', 'url'])
  },
  {
    key: 'refund_approved',
    name: 'Refund Approved',
    category: 'billing',
    subject: 'Refund processed for Invoice #{{invoiceId}}',
    htmlBody: createEmailTemplateHtml({
      title: 'Refund Approved',
      headline: 'Refund Processed Successfully',
      body: 'Hi {{name}},<br><br>This email is to confirm that a refund of <strong>${{amount}}</strong> has been successfully processed for Invoice #{{invoiceId}}. The funds will be credited back to your original payment method within 5 to 10 business days.',
      bentoRows: [
        { label: 'Refunded Amount', value: '${{amount}}' },
        { label: 'Target Invoice', value: '#{{invoiceId}}' },
        { label: 'Status', value: 'Completed' }
      ]
    }),
    textBody: 'Hi {{name}},\n\nWe have successfully processed a refund of ${{amount}} for Invoice #{{invoiceId}}.',
    variables: JSON.stringify(['name', 'amount', 'invoiceId'])
  },
  {
    key: 'refund_rejected',
    name: 'Refund Request Update',
    category: 'billing',
    subject: 'Update on your refund request for Invoice #{{invoiceId}}',
    htmlBody: createEmailTemplateHtml({
      title: 'Refund Request Update',
      headline: 'Refund Request Declined',
      body: 'Hi {{name}},<br><br>Our team has completed the review of your refund request for Invoice #{{invoiceId}} in the amount of <strong>${{amount}}</strong>. Unfortunately, we are unable to process this refund as it does not meet our refund eligibility terms.'
    }),
    textBody: 'Hi {{name}},\n\nYour refund request for ${{amount}} on Invoice #{{invoiceId}} has been declined.',
    variables: JSON.stringify(['name', 'amount', 'invoiceId'])
  },
  {
    key: '2fa_enabled',
    name: '2FA Enabled',
    category: 'security',
    subject: 'Two-Factor Authentication (2FA) is now enabled',
    htmlBody: createEmailTemplateHtml({
      title: '2FA Activated',
      headline: 'Two-Factor Authentication Enabled',
      body: 'Hi {{name}},<br><br>This security confirmation certifies that Two-Factor Authentication (2FA) is now successfully enabled on your CareerForge AI profile. You will now be requested to provide a 6-digit verification code alongside your password when logging in.'
    }),
    textBody: 'Hi {{name}},\n\nTwo-Factor Authentication (2FA) is now enabled for your account.',
    variables: JSON.stringify(['name'])
  },
  {
    key: '2fa_disabled',
    name: '2FA Disabled',
    category: 'security',
    subject: 'WARNING: Two-Factor Authentication (2FA) was disabled',
    htmlBody: createEmailTemplateHtml({
      title: '2FA Disabled Alert',
      headline: 'Two-Factor Authentication Disabled',
      body: 'Hi {{name}},<br><br>This is an automated notification confirming that Two-Factor Authentication (2FA) was turned off for your CareerForge AI account.',
      alertMessage: 'IMPORTANT SECURITY WARNING: Your account is now vulnerable to unauthorized access. If you did not request this disablement, please log in and re-enable 2FA immediately.'
    }),
    textBody: 'Hi {{name}},\n\nWARNING: Two-Factor Authentication (2FA) was disabled for your account.',
    variables: JSON.stringify(['name'])
  },
  {
    key: 'new_device_login',
    name: 'New Device Login',
    category: 'security',
    subject: 'Security Alert: New login from {{device}}',
    htmlBody: createEmailTemplateHtml({
      title: 'New Login Security Alert',
      headline: 'Unrecognized Login Detected',
      body: 'Hi {{name}},<br><br>We detected a new login to your CareerForge AI profile from an unrecognized device or browser session. Please review the transaction metadata below:',
      bentoRows: [
        { label: 'Device / Browser', value: '{{device}}' },
        { label: 'IP Address', value: '{{ip}}' },
        { label: 'Timestamp', value: '{{time}}' }
      ],
      alertMessage: 'If this was you, no action is required. If this was not you, please secure your account immediately by resetting your password.'
    }),
    textBody: 'Hi {{name}},\n\nWe detected a new login from {{device}} (IP: {{ip}}) at {{time}}.',
    variables: JSON.stringify(['name', 'device', 'ip', 'time'])
  }
];

// Initialize default templates if not exist
const initTemplates = async () => {
  for (const template of defaultTemplates) {
    const existing = await prisma.emailTemplate.findUnique({ where: { key: template.key } });
    if (!existing) {
      await prisma.emailTemplate.create({ data: template });
    } else if (existing.version === 1 || existing.htmlBody.startsWith('<p>Hi') || existing.htmlBody.startsWith('<h2>New Contact')) {
      // It has the old simple default HTML, upgrade it to our professional design!
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          name: template.name,
          category: template.category,
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          variables: template.variables,
          version: existing.version + 1,
        }
      });
    }
  }
};

export { defaultTemplates, initTemplates };

emailsRouter.get('/', async (req, res) => {
  try {
    await initTemplates();
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { category: 'asc' }
    });
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

emailsRouter.post('/', async (req, res) => {
  try {
    const { name, key, category, subject, htmlBody, textBody, variables, isActive } = req.body;

    const newTemplate = await prisma.emailTemplate.create({
      data: {
        name,
        key,
        category,
        subject,
        htmlBody,
        textBody,
        variables,
        isActive,
        version: 1,
        updatedBy: (req as any).user?.email || 'Admin'
      }
    });

    await logAdminAction(req, 'Create Email Template', null, null, newTemplate.key);
    res.json({ template: newTemplate });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

emailsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, key, category, subject, htmlBody, textBody, variables, isActive } = req.body;

    const oldTemplate = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!oldTemplate) return res.status(404).json({ error: 'Template not found' });

    const version = oldTemplate.htmlBody !== htmlBody || oldTemplate.textBody !== textBody 
      ? oldTemplate.version + 1 
      : oldTemplate.version;

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: { 
        name, key, category, subject, htmlBody, textBody, variables, isActive, version, 
        updatedBy: (req as any).user?.email || 'Admin' 
      }
    });

    await logAdminAction(req, 'Update Email Template', null, JSON.stringify(oldTemplate), JSON.stringify(updatedTemplate));
    res.json({ template: updatedTemplate });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

emailsRouter.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, testVariables } = req.body;
    
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // We don't use sendTemplateEmail because it logs to DB and checks isActive. 
    // We want to just send it dynamically for testing.
    const { sendEmail } = await import('../../services/email/emailService');
    
    const subject = replaceVariables(template.subject, testVariables || {});
    const html = replaceVariables(template.htmlBody, testVariables || {});
    const text = replaceVariables(template.textBody, testVariables || {});

    await sendEmail({
      to: email,
      subject: `[TEST] ${subject}`,
      html,
      text,
      templateId: template.id // it will still log it!
    });

    await logAdminAction(req, 'Send Test Email', null, null, `Template: ${template.key} to ${email}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

emailsRouter.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const defaultTemplate = defaultTemplates.find(t => t.key === template.key);
    if (!defaultTemplate) return res.status(404).json({ error: 'Default template not found' });

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: {
        subject: defaultTemplate.subject,
        htmlBody: defaultTemplate.htmlBody,
        textBody: defaultTemplate.textBody,
        variables: defaultTemplate.variables,
        version: template.version + 1,
        updatedBy: (req as any).user?.email || 'Admin'
      }
    });

    await logAdminAction(req, 'Restore Email Template', null, null, updatedTemplate.key);
    res.json({ template: updatedTemplate });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore email template' });
  }
});

// Logs endpoint
emailsRouter.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        include: { template: { select: { name: true, key: true } } }
      }),
      prisma.emailLog.count()
    ]);

    res.json({ logs, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
});

export default emailsRouter;
