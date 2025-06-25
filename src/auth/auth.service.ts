import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@prisma/client';
// 1. (CORREÇÃO) Importar a biblioteca bcrypt
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma.service';

export interface JwtPayload {
  access_token: string;
}

export type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 2. (CORREÇÃO) Ajustar o tipo de retorno para aceitar 'null'
  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      // 3. (CORREÇÃO) Adicionar comentário para o linter
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // O Prisma Client já retorna tipos fortes, então o retorno aqui está ok.
  // Apenas precisamos adicionar o bcrypt.
  async createUser(createUserDto: CreateUserDto) {
    const { email, password, name } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('O e-mail já está em uso.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // O retorno aqui já é fortemente tipado pelo Prisma
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        wallet: {
          create: {
            name: 'Carteira Principal',
          },
        },
      },
      include: {
        wallet: true,
      },
    });
  }

  // 4. (CORREÇÃO) Remover 'async' e 'Promise' pois o método é síncrono
  login(user: UserWithoutPassword): JwtPayload {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateOAuthUser(email: string, name: string): Promise<JwtPayload> {
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          wallet: {
            create: { name: 'Carteira Principal' },
          },
        },
      });
    }

    // 3. (CORREÇÃO) Adicionar comentário para o linter
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;

    // O método 'login' agora é síncrono, mas o 'validateOAuthUser' continua
    // sendo assíncrono, então o retorno aqui permanece o mesmo.
    return this.login(result);
  }
}
