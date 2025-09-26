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
  return sendEmail({
    to: email,
    from: 'noreply@hiddo.app', // You should use a verified sender email
    subject: 'Your Hiddo verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Hiddo!</h2>
        <p>Thank you for signing up. Please enter the verification code below in the app:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: monospace;">
              ${token}
            </span>
          </div>
        </div>
        <p style="text-align: center; color: #6b7280;">Enter this 6-digit code to verify your email address</p>
        <p style="color: #6b7280; font-size: 14px;">
          This code will expire in 10 minutes. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to Hiddo! Your verification code is: ${token}. Enter this code in the app to verify your email address.`
  });
}