import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY not set - email sending will be simulated");
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!mailService) {
      // Simulate email sending in development
      console.log('\n📧 [SIMULATED EMAIL]');
      console.log('To:', params.to);
      console.log('From:', params.from);
      console.log('Subject:', params.subject);
      console.log('Text:', params.text);
      console.log('HTML length:', params.html?.length || 0);
      console.log('-------------------\n');
      return true;
    }
    
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000';
  const verificationUrl = `${domain}/verify-email?token=${token}`;
  
  return sendEmail({
    to: email,
    from: 'noreply@hiddo.app', // You should use a verified sender email
    subject: 'Verify your Hiddo account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Hiddo!</h2>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
        <p style="color: #6b7280; font-size: 14px;">
          This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to Hiddo! Please verify your email address by visiting: ${verificationUrl}`
  });
}