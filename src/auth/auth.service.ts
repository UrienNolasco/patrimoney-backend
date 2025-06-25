import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

export interface JwtPayload {
  access_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Para a estratégia local (login com senha)
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // Para criar um novo usuário (registro)
  async createUser(createUserDto: CreateUserDto) {
    const { email, password, name } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('O e-mail já está em uso.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        wallet: {
          // Cria uma carteira padrão para o novo usuário
          create: {
            name: 'Carteira Principal',
          },
        },
      },
      include: {
        // Inclui a carteira no retorno
        wallet: true,
      },
    });
  }

  // Para o login efetivo e geração do token
  async login(user: Omit<User, 'password'>): Promise<JwtPayload> {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // Para o fluxo do Google OAuth
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

    const { password, ...result } = user;
    return this.login(result);
  }
}
