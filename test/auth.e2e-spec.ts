import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

import { createTestApp } from './setup';
import { PrismaService } from 'src/prisma.service';
import { JwtPayload } from 'src/auth/auth.service';

type UserWithoutPassword = Omit<User, 'password'>;

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Array para guardar os IDs dos usuários criados para limpeza no final
  const createdUserIds: string[] = [];

  // Usamos beforeAll para configurar a aplicação uma única vez
  beforeAll(async () => {
    // 2. Usa a função helper para criar e configurar a aplicação de teste
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  // afterAll será executado uma vez no final de todos os testes deste 'describe'
  afterAll(async () => {
    // Limpeza segura e direcionada dos dados criados
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }
    // Fecha a conexão da aplicação
    await app.close();
  });

  // =====================
  // Testes de Registro
  // =====================
  describe('/auth/register (POST)', () => {
    const registerDto = {
      email: `register.user.${Date.now()}@example.com`,
      password: 'password123',
      name: 'Register User',
    };

    it('should create a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201)
        .then((response) => {
          const body = response.body as UserWithoutPassword;
          expect(body).toHaveProperty('id');
          expect(body.email).toEqual(registerDto.email);
          expect(body).not.toHaveProperty('password');
          createdUserIds.push(body.id);
        });
    });

    it('should return 409 Conflict if email already exists', async () => {
      // 1. Cria o usuário pela primeira vez
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...registerDto, email: `conflict.${Date.now()}@example.com` })
        .expect(201);

      const createdUser = response.body as UserWithoutPassword;
      createdUserIds.push(createdUser.id);

      // 2. Tenta criar com o mesmo e-mail
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...registerDto, email: createdUser.email })
        .expect(409);
    });

    it('should return 400 Bad Request for invalid data', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid', password: '123' })
        .expect(400)
        .then((response) => {
          const errorBody = response.body as ErrorResponse;
          expect(errorBody.message).toEqual(
            expect.arrayContaining([
              'Formato de e-mail inválido.',
              'A senha deve ter no mínimo 8 caracteres.',
            ]),
          );
        });
    });
  });

  // =====================
  // Testes de Login
  // =====================
  describe('/auth/login (POST)', () => {
    const loginDto = {
      email: `login.user.${Date.now()}@example.com`,
      password: 'passwordSegura123',
    };

    // Antes dos testes de login, precisamos criar o usuário no banco
    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const user = await prisma.user.create({
        data: {
          email: loginDto.email,
          password: hashedPassword,
          name: 'Login Test User',
        },
      });
      createdUserIds.push(user.id);
    });

    it('should login successfully and return an access token', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto) // Enviamos a senha em texto plano
        .expect(201)
        .then((response) => {
          // (CORREÇÃO) Atribuir o body a uma constante com o tipo JwtPayload
          const body = response.body as JwtPayload;

          // Agora os acessos são seguros e sem erros do linter!
          expect(body).toHaveProperty('access_token');
          expect(typeof body.access_token).toBe('string');
        });
    });

    it('should return 401 Unauthorized for incorrect password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...loginDto, password: 'senha-errada' })
        .expect(401)
        .then((response) => {
          const errorBody = response.body as ErrorResponse;
          expect(errorBody.message).toEqual('Credenciais inválidas.');
        });
    });
  });
});
