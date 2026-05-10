import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-linkedin-oauth2';
import linkedinOAuthConfig from '../config/linkedin-oauth.config';
import { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(
    @Inject(linkedinOAuthConfig.KEY)
    private readonly linkedinConfig: ConfigType<typeof linkedinOAuthConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: linkedinConfig.clientId,
      clientSecret: linkedinConfig.clientSecret,
      callbackURL: linkedinConfig.callbackURL,
      scope: ['openid', 'profile', 'email'], // ✅ Seulement les scopes autorisés par OpenID Connect
      state: true,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    const providerId = profile.id;
    const name = profile.displayName || `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim();
    const email = `${providerId}@linkedin.com`; // fallback email

    try {
      const user = await this.authService.validateOrCreateOAuthUser({
        email,
        name,
        providerId,
        provider: 'linkedin',
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
}
