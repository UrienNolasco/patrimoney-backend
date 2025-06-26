import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './setup'; // <-- 1. IMPORTAÇÃO DO HELPER
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { PortfolioItemEntity } from 'src/portfolio/entities/portfolio.entity';
import { PrismaService } from 'src/prisma.service';
import { JwtPayload, UserWithoutPassword } from 'src/auth/auth.service';

describe('PortfolioController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    // ==========================================================
    // PARTE 1: SETUP GENÉRICO DA APLICAÇÃO USANDO O HELPER
    // ==========================================================
    const testApp = await createTestApp(); // <-- 2. USO DO HELPER
    app = testApp.app;
    prisma = testApp.prisma;

    // ==========================================================
    // PARTE 2: SETUP ESPECÍFICO DE DADOS PARA ESTE TESTE
    // (Criar usuário, itens de portfólio e obter token)
    // ==========================================================
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        email: `portfolio.user.${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Portfolio User',
        wallet: {
          create: {
            name: 'Portfolio Test Wallet',
            portfolioItems: {
              create: [
                { stockSymbol: 'PETR4', quantity: 50, avgCost: 30.0 },
                { stockSymbol: 'VALE3', quantity: 25, avgCost: 65.0 },
              ],
            },
          },
        },
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      });
    const loginBody = loginResponse.body as JwtPayload;
    authToken = loginBody.access_token;
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await app.close();
  });

  describe('GET /portfolio', () => {
    it('should return the consolidated portfolio for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const portfolio = response.body as PortfolioItemEntity[];

      expect(portfolio).toHaveLength(2);

      const petr4Item = portfolio.find((p) => p.stockSymbol === 'PETR4');
      const vale3Item = portfolio.find((p) => p.stockSymbol === 'VALE3');

      expect(petr4Item).toBeDefined();
      expect(petr4Item?.stockName).toEqual('Petrobras PN');
      expect(petr4Item?.quantity).toEqual('50');
      expect(petr4Item?.avgCost).toEqual('30');

      expect(vale3Item).toBeDefined();
      expect(vale3Item?.stockName).toEqual('Vale ON');
      expect(vale3Item?.quantity).toEqual('25');
      expect(vale3Item?.avgCost).toEqual('65');
    });

    it('should return 401 Unauthorized if no token is provided', () => {
      return request(app.getHttpServer()).get('/portfolio').expect(401);
    });

    it('should return an empty array if user has no portfolio items', async () => {
      const newUserDto = {
        email: `empty.portfolio.${Date.now()}@example.com`,
        password: 'password123',
        name: 'Empty User',
      };
      const createdUserRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(newUserDto);
      const createdUserBody = createdUserRes.body as UserWithoutPassword;

      // 2. Tipar a resposta do login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(newUserDto);
      const loginBody = loginRes.body as JwtPayload;
      const newUserToken = loginBody.access_token;

      // 3. Fazer a requisição principal com os dados seguros
      const response = await request(app.getHttpServer())
        .get('/portfolio')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body).toEqual([]);

      // 4. Usar o ID do usuário de forma segura para a limpeza
      await prisma.user.delete({ where: { id: createdUserBody.id } });
    });
  });
});
