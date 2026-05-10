import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-facebook';
import facebookOauthConfig from '../config/facebook-oauth.config';
import { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Profile } from 'passport';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    @Inject(facebookOauthConfig.KEY)
    private facebookConfiguration: ConfigType<typeof facebookOauthConfig>,
    private authService: AuthService,
  ) {
    super({
      clientID: facebookConfiguration.clientId,
      clientSecret: facebookConfiguration.clientSecret,
      callbackURL: facebookConfiguration.callbackURL,
      profileFields: ['id', 'displayName', 'emails'],
      scope: ['email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ) {
    const email = profile.emails?.[0]?.value ?? `${profile.id}@facebook.com`;
    const name = profile.displayName;
    const providerId = profile.id;

    try {
      const user = await this.authService.validateOrCreateOAuthUser({
        email,
        name,
        providerId,
        provider: 'facebook', // ✅
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
}
