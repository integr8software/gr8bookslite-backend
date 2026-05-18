export type PasswordResetTokenPayload = {
  sub: number;
  email: string;
  purpose: 'PASSWORD_RESET';
  verificationId: number;
};
