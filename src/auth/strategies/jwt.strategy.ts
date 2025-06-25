// src/auth/jwt.strategy.ts

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

// 1. (Boa Prática) Criar uma interface para o payload do token
//    Isso garante que o formato do que você assina e do que você valida é o mesmo.
export interface JwtTokenPayload {
  sub: string;
  email: string;
}

// 2. (Boa Prática) Criar um tipo para o usuário sem a senha, que será retornado
export type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    // 3. Adicionamos a mesma validação para garantir que a variável existe
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não foi encontrada no .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // Passamos a variável já validada
    });
  }

  /**
   * Este método é chamado pelo Passport em rotas protegidas pelo JwtAuthGuard.
   * Ele recebe o payload decodificado do token JWT e deve retornar os dados do usuário.
   * O que for retornado aqui será anexado ao objeto `request.user`.
   */
  async validate(payload: JwtTokenPayload): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    // 4. Se o usuário do token não existir mais no banco, rejeitamos a requisição
    if (!user) {
      throw new UnauthorizedException(
        'Token inválido ou usuário não encontrado.',
      );
    }

    // 5. (CRUCIAL PARA SEGURANÇA) Removemos o campo da senha antes de retornar o objeto
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;

    return result;
  }
}
