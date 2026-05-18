import type { GoogleAuthMode } from './google-auth-mode.type';

export type GoogleOAuthStatePayload = {
  purpose: 'GOOGLE_OAUTH_STATE';
  mode: GoogleAuthMode;
};
