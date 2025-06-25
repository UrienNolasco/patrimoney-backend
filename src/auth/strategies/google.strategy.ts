// src/auth/strategies/google.strategy.ts

import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // ... construtor sem alterações
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'As credenciais do Google OAuth não foram encontradas no .env',
      );
    }

    super({ clientID, clientSecret, callbackURL, scope: ['email', 'profile'] });
  }

  async validate(
    // MUDANÇA 3: Adicionar underscores para indicar que são ignorados
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { name, emails, photos } = profile;

    if (!emails || emails.length === 0) {
      done(new Error('Nenhum e-mail do Google foi retornado.'));
      return;
    }

    const userPayload = {
      email: emails[0].value,
      name: name ? `${name.givenName} ${name.familyName}` : 'Usuário Google',
      picture: photos && photos.length > 0 ? photos[0].value : null,
    };

    // Agora o 'jwt' será corretamente inferido como tipo 'JwtPayload'
    const jwt = await this.authService.validateOAuthUser(
      userPayload.email,
      userPayload.name,
    );

    done(null, jwt);
  }
}
