import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { User, Wallet } from '@prisma/client'; // (CORREÇÃO) Garantir que Wallet está importado
import { createTestApp } from './setup';
import { JwtPayload } from '../src/auth/auth.service'; // (CORREÇÃO) Importar JwtPayload
import { PrismaService } from 'src/prisma.service';

describe('WalletController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUser: User;

  const walletUserDto = {
    email: `wallet.e2e.${Date.now()}@example.com`,
    password: 'e2e-password',
    name: 'E2E Wallet User',
  };

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;

    const hashedPassword = await bcrypt.hash(walletUserDto.password, 10);
    testUser = await prisma.user.create({
      data: {
        ...walletUserDto,
        password: hashedPassword,
        wallet: { create: { name: 'Carteira Inicial' } },
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: walletUserDto.email,
        password: walletUserDto.password,
      });

    // (CORREÇÃO) Tipar o corpo da resposta do login
    const loginBody = loginResponse.body as JwtPayload;
    authToken = loginBody.access_token;
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await app.close();
  });

  describe('/wallet (GET)', () => {
    it('should fetch the authenticated user wallet', () => {
      return request(app.getHttpServer())
        .get('/wallet')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .then((response) => {
          // (CORREÇÃO) Tipar o corpo da resposta da carteira
          const wallet = response.body as Wallet;

          expect(wallet).toHaveProperty('id');
          expect(wallet).toHaveProperty('name', 'Carteira Inicial');
          expect(wallet.userId).toEqual(testUser.id);
        });
    });

    it('should return 401 Unauthorized if no token is provided', () => {
      return request(app.getHttpServer()).get('/wallet').expect(401);
    });
  });

  describe('/wallet (PATCH)', () => {
    it('should update the authenticated user wallet', () => {
      const updateDto = { name: 'Carteira Principal Renomeada' };

      return request(app.getHttpServer())
        .patch('/wallet')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200)
        .then((response) => {
          // (CORREÇÃO) Tipar o corpo da resposta da carteira atualizada
          const updatedWallet = response.body as Wallet;

          expect(updatedWallet.name).toEqual(updateDto.name);
          expect(updatedWallet.userId).toEqual(testUser.id);
        });
    });

    it('should return 401 Unauthorized if no token is provided', () => {
      return request(app.getHttpServer())
        .patch('/wallet')
        .send({ name: 'Tentativa sem token' })
        .expect(401);
    });
  });
});
