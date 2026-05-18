import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Job,
  Queue,
  Worker,
  type JobsOptions,
  type RedisOptions,
} from 'bullmq';
import nodemailer, { type Transporter } from 'nodemailer';

type MailJobName =
  | 'verification-code'
  | 'password-reset-code'
  | 'onboarding-congratulations';

type MailJobData =
  | {
      type: 'verification-code';
      email: string;
      code: string;
    }
  | {
      type: 'password-reset-code';
      email: string;
      code: string;
    }
  | {
      type: 'onboarding-congratulations';
      email: string;
      recipientName: string;
      companyName: string;
    };

@Injectable()
export class AuthMailService implements OnModuleInit, OnModuleDestroy {
  private static readonly queueName = 'mail';

  private readonly logger = new Logger(AuthMailService.name);
  private readonly transporter: Transporter;
  private readonly fromEmail: string;
  private readonly queueEnabled: boolean;
  private readonly jobOptions: JobsOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 60 * 60 * 24,
      count: 1000,
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 7,
    },
  };
  private mailQueue?: Queue<MailJobData>;
  private mailWorker?: Worker<MailJobData>;

  constructor(private readonly configService: ConfigService) {
    this.queueEnabled =
      this.configService.get<string>('MAIL_QUEUE_ENABLED', 'false') === 'true';
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

  onModuleInit() {
    if (!this.queueEnabled) {
      this.logger.log('Mail queue disabled; emails will be sent inline.');
      return;
    }

    const connection = this.getRedisConnectionOptions();
    this.mailQueue = new Queue<MailJobData>(AuthMailService.queueName, {
      connection,
      defaultJobOptions: this.jobOptions,
    });
    this.mailWorker = new Worker<MailJobData>(
      AuthMailService.queueName,
      (job) => this.processMailJob(job),
      {
        connection,
        concurrency: this.getMailWorkerConcurrency(),
      },
    );

    this.mailWorker.on('completed', (job) => {
      this.logger.debug(`Mail job ${job.id} completed: ${job.name}.`);
    });
    this.mailWorker.on('failed', (job, error) => {
      this.logger.error(
        `Mail job ${job?.id ?? 'unknown'} failed: ${error.message}`,
        error.stack,
      );
    });

    this.logger.log('Mail queue enabled with BullMQ.');
  }

  async onModuleDestroy() {
    await this.mailWorker?.close();
    await this.mailQueue?.close();
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    if (this.mailQueue) {
      await this.enqueueMail('verification-code', {
        type: 'verification-code',
        email,
        code,
      });
      return;
    }

    await this.sendVerificationCodeNow(email, code);
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    if (this.mailQueue) {
      await this.enqueueMail('password-reset-code', {
        type: 'password-reset-code',
        email,
        code,
      });
      return;
    }

    await this.sendPasswordResetCodeNow(email, code);
  }

  async sendOnboardingCongratulations(
    email: string,
    recipientName: string,
    companyName: string,
  ): Promise<void> {
    if (this.mailQueue) {
      await this.enqueueMail('onboarding-congratulations', {
        type: 'onboarding-congratulations',
        email,
        recipientName,
        companyName,
      });
      return;
    }

    await this.sendOnboardingCongratulationsNow(
      email,
      recipientName,
      companyName,
    );
  }

  private async enqueueMail(name: MailJobName, data: MailJobData) {
    await this.mailQueue?.add(name, data);
    this.logger.debug(`Mail job queued for ${data.email}: ${name}.`);
  }

  private async processMailJob(job: Job<MailJobData>) {
    switch (job.data.type) {
      case 'verification-code':
        await this.sendVerificationCodeNow(job.data.email, job.data.code);
        return;
      case 'password-reset-code':
        await this.sendPasswordResetCodeNow(job.data.email, job.data.code);
        return;
      case 'onboarding-congratulations':
        await this.sendOnboardingCongratulationsNow(
          job.data.email,
          job.data.recipientName,
          job.data.companyName,
        );
        return;
    }
  }

  private async sendVerificationCodeNow(
    email: string,
    code: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: 'Verify your account',
      text: `Your verification code is ${code}. This code will expire soon.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>This code will expire soon.</p>`,
    });

    this.logger.debug(`Verification email sent for ${email}.`);
  }

  private async sendPasswordResetCodeNow(
    email: string,
    code: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: 'Reset your password',
      text: `Your password reset code is ${code}. This code will expire soon.`,
      html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>This code will expire soon.</p>`,
    });

    this.logger.debug(`Password reset email sent for ${email}.`);
  }

  private async sendOnboardingCongratulationsNow(
    email: string,
    recipientName: string,
    companyName: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: 'Congratulations on completing your setup',
      text: `Congratulations, ${recipientName}! Your onboarding for ${companyName} is complete. You can now start exploring your dashboard and setting up your workflow.`,
      html: `
        <p>Congratulations, <strong>${recipientName}</strong>!</p>
        <p>Your onboarding for <strong>${companyName}</strong> is complete.</p>
        <p>You can now start exploring your dashboard and setting up your workflow.</p>
      `,
    });

    this.logger.debug(`Onboarding congratulations email sent for ${email}.`);
  }

  private getRedisConnectionOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      const parsedUrl = new URL(redisUrl);

      return {
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port || 6379),
        username: parsedUrl.username
          ? decodeURIComponent(parsedUrl.username)
          : undefined,
        password: parsedUrl.password
          ? decodeURIComponent(parsedUrl.password)
          : undefined,
        db: parsedUrl.pathname
          ? Number(parsedUrl.pathname.replace('/', '') || 0)
          : undefined,
        tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
      };
    }

    return {
      host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
      port: Number(this.configService.get<string | number>('REDIS_PORT', 6379)),
      username: this.configService.get<string>('REDIS_USERNAME') || undefined,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: Number(this.configService.get<string | number>('REDIS_DB', 0)),
      maxRetriesPerRequest: null,
    };
  }

  private getMailWorkerConcurrency() {
    const concurrency = Number(
      this.configService.get<string | number>('MAIL_QUEUE_CONCURRENCY', 2),
    );

    return Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 2;
  }
}
