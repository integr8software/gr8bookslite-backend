import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class AuthMailService {
  private readonly logger = new Logger(AuthMailService.name);
  private readonly transporter: Transporter;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const smtpUrl = this.configService.get<string>('SMTP_URL');
    this.fromEmail = this.configService.get<string>(
      'MAIL_FROM',
      'no-reply@example.com',
    );

    if (smtpUrl) {
      this.transporter = nodemailer.createTransport(smtpUrl);
      return;
    }

    const host = this.configService.get<string>('SMTP_HOST');

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure:
          this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: this.configService.get<string>('SMTP_USER')
          ? {
              user: this.configService.get<string>('SMTP_USER'),
              pass: this.configService.get<string>('SMTP_PASS'),
            }
          : undefined,
      });
      return;
    }

    // Local fallback so development remains usable without SMTP credentials.
    this.transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: 'Verify your account',
      text: `Your verification code is ${code}. This code will expire soon.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>This code will expire soon.</p>`,
    });

    this.logger.debug(`Verification email queued for ${email}.`);
  }
}
