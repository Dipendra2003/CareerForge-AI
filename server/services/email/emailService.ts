import nodemailer from 'nodemailer';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';

const poolConfig = {
  pool: true,
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
};

const transporter = nodemailer.createTransport(poolConfig);

export const sendEmail = async ({ to, subject, html, text, templateId }: { to: string, subject: string, html: string, text: string, templateId?: string }) => {
  let status = "Sent";
  let errorMessage: string | null = null;
  
  try {
    const from = process.env.SMTP_FROM || '"CareerForge AI" <no-reply@careerforgeai.com>';
    
    // Using a timeout of 10 seconds for the send operation
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("SMTP Connection Timeout")), 10000);
      
      transporter.sendMail({ from, to, subject, html, text }, (err, info) => {
        clearTimeout(timeout);
        if (err) return reject(err);
        resolve(info);
      });
    });

    console.log(`[EmailService] Successfully sent email to anonymized recipient.`);
  } catch (error) {
    console.error(`[EmailService] Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`);
    status = "Failed";
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  // Log to database
  try {
    await prisma.emailLog.create({
      data: {
        templateId,
        recipient: to, // usually anonymize but for logs we keep it or hash it. Let's keep it for admin logs.
        subject,
        status,
        provider: "smtp",
        errorMessage,
      }
    });
  } catch (logError) {
    console.error(`[EmailService] Failed to create EmailLog:`, logError);
  }
};

/**
 * Replaces variables like {{name}} with their values from the variables object.
 */
export const replaceVariables = (template: string, variables: Record<string, string>): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    // replace all occurrences of {{key}}
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
};

/**
 * Fetches template from DB, replaces variables, and sends email.
 */
export const sendTemplateEmail = async (
  templateKey: string,
  to: string,
  variables: Record<string, string>
) => {
  const template = await prisma.emailTemplate.findUnique({
    where: { key: templateKey },
  });

  if (!template) {
    console.error(`[EmailService] Template '${templateKey}' not found in database.`);
    return;
  }

  if (!template.isActive) {
    console.log(`[EmailService] Template '${templateKey}' is inactive. Email not sent.`);
    return;
  }

  const subject = replaceVariables(template.subject, variables);
  const html = replaceVariables(template.htmlBody, variables);
  const text = replaceVariables(template.textBody, variables);

  await sendEmail({
    to,
    subject,
    html,
    text,
    templateId: template.id
  });
};
