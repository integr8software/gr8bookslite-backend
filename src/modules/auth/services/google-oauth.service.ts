import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { GoogleAuthMode } from '../types/google-auth-mode.type';
import type { GoogleOAuthStatePayload } from '../types/google-oauth-state-payload.type';
import type { GoogleTokenResponse } from '../types/google-token-response.type';
import type { GoogleUserProfile } from '../types/google-user-profile.type';

type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  frontendCallbackUrl: string;
};

@Injectable()
export class GoogleOAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  beginAuth(mode?: string) {
    const googleConfig = this.getConfig();
    const normalizedMode = this.normalizeMode(mode);
    const state = this.jwtService.sign(
      {
        purpose: 'GOOGLE_OAUTH_STATE',
        mode: normalizedMode,
      } satisfies GoogleOAuthStatePayload,
      { expiresIn: 600 },
    );
    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    authorizationUrl.search = new URLSearchParams({
      client_id: googleConfig.clientId,
      redirect_uri: googleConfig.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
    }).toString();

    return authorizationUrl.toString();
  }

  async fetchProfile(code: string): Promise<GoogleUserProfile> {
    const googleConfig = this.getConfig();
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        redirect_uri: googleConfig.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenPayload = (await tokenResponse.json().catch(() => null)) as GoogleTokenResponse | null;

    if (!tokenResponse.ok || !tokenPayload?.access_token) {
      throw new BadRequestException(tokenPayload?.error_description ?? 'Failed to exchange the Google authorization code.');
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    });
    const profile = (await profileResponse.json().catch(() => null)) as GoogleUserProfile | null;

    if (!profileResponse.ok || !profile) {
      throw new BadRequestException('Failed to read the Google account profile.');
    }

    return profile;
  }

  readState(state?: string) {
    if (!state) {
      return {
        mode: 'login' as GoogleAuthMode,
        isValid: false,
      };
    }

    try {
      const payload = this.jwtService.verify<GoogleOAuthStatePayload>(state);

      if (payload.purpose !== 'GOOGLE_OAUTH_STATE') {
        return {
          mode: 'login' as GoogleAuthMode,
          isValid: false,
        };
      }

      return {
        mode: this.normalizeMode(payload.mode),
        isValid: true,
      };
    } catch {
      return {
        mode: 'login' as GoogleAuthMode,
        isValid: false,
      };
    }
  }

  buildFrontendRedirect(params: { mode: GoogleAuthMode; handoffCode?: string; error?: string }) {
    const { frontendCallbackUrl } = this.getConfig();
    const redirectUrl = new URL(frontendCallbackUrl);

    redirectUrl.searchParams.set('mode', params.mode);

    if (params.handoffCode) {
      redirectUrl.searchParams.set('handoffCode', params.handoffCode);
    }

    if (params.error) {
      redirectUrl.searchParams.set('error', params.error);
    }

    return redirectUrl.toString();
  }

  private getConfig(): GoogleOAuthConfig {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');
    const frontendCallbackUrl = this.configService.get<string>('GOOGLE_FRONTEND_CALLBACK_URL');

    if (!clientId || !clientSecret || !redirectUri || !frontendCallbackUrl) {
      throw new BadRequestException('Google OAuth is not configured correctly on the server.');
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      frontendCallbackUrl,
    };
  }

  private normalizeMode(mode?: string): GoogleAuthMode {
    return mode === 'signup' ? 'signup' : 'login';
  }
}
