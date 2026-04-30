import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  generateCode(length = 4): string {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;

    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  hashCode(code: string): Promise<string> {
    return bcrypt.hash(code, 10);
  }

  compareCode(code: string, hash: string): Promise<boolean> {
    return bcrypt.compare(code, hash);
  }

  maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');

    if (!localPart || !domain) {
      return email;
    }

    if (localPart.length <= 2) {
      return `${localPart[0] ?? '*'}*@${domain}`;
    }

    const visibleStart = localPart.slice(0, 2);
    const visibleEnd = localPart.slice(-2);
    const hidden = '*'.repeat(Math.max(localPart.length - 4, 3));

    return `${visibleStart}${hidden}${visibleEnd}@${domain}`;
  }
}
