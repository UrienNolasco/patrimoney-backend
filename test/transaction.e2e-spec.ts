// test/transaction.e2e-spec.ts

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { User, Wallet, Transaction } from '@prisma/client';

import { createTestApp } from './setup';

import { BrapiResult } from 'src/market-data/dto/brapi-quote.response.dto';
import { PrismaService } from 'src/prisma.service';
import { BrapiService } from 'src/market-data/services/brapi/brapi.service';
import { JwtPayload } from 'src/auth/auth.service';

describe('TransactionController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let brapiService: BrapiService;
  let authToken: string;
  let testUser: User & { wallet: Wallet };
  let testWallet: Wallet;

  // Stocks que serão criados ou limpos durante os testes
  const stocksToCleanup = ['WEGE3', 'ITUB4'];

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    brapiService = app.get<BrapiService>(BrapiService);

    // Setup do usuário principal para os testes
    const txUserDto = {
      email: `tx.e2e.${Date.now()}@example.com`,
      password: 'e2e-tx-password',
    };
    const hashedPassword = await bcrypt.hash(txUserDto.password, 10);
    testUser = (await prisma.user.create({
      data: {
        ...txUserDto,
        password: hashedPassword,
        wallet: { create: { name: 'TX Test Wallet' } },
      },
      include: { wallet: true },
    })) as User & { wallet: Wallet };
    testWallet = testUser.wallet;

    // Login para obter token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(txUserDto);
    const loginBody = loginResponse.body as JwtPayload;
    authToken = loginBody.access_token;
  });

  afterAll(async () => {
    // Limpeza completa
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await prisma.stock.deleteMany({
      where: { symbol: { in: stocksToCleanup } },
    });
    await app.close();
  });

  describe('/transactions (POST)', () => {
    const stockSymbol = 'PETR4'; // Assumindo que PETR4 existe no banco via seed

    it('should register the first BUY transaction and create a portfolio item', async () => {
      const dto = {
        walletId: testWallet.id,
        stockSymbol,
        type: 'BUY',
        quantity: 10,
        price: 35.5,
        executedAt: new Date().toISOString(),
      };
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      const item = await prisma.portfolioItem.findUnique({
        where: {
          walletId_stockSymbol: { walletId: testWallet.id, stockSymbol },
        },
      });
      expect(item).toBeDefined();
      expect(item!.quantity.toNumber()).toBe(10);
      expect(item!.avgCost.toNumber()).toBe(35.5);
    });

    it('should register a second BUY and correctly update the avgCost', async () => {
      const dto = {
        walletId: testWallet.id,
        stockSymbol,
        type: 'BUY',
        quantity: 5,
        price: 37.0,
        executedAt: new Date().toISOString(),
      };
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      const item = await prisma.portfolioItem.findUnique({
        where: {
          walletId_stockSymbol: { walletId: testWallet.id, stockSymbol },
        },
      });
      // Cálculo esperado: (10*35.5 + 5*37) / 15 = 36
      expect(item!.quantity.toNumber()).toBe(15);
      expect(item!.avgCost.toNumber()).toBe(36);
    });

    it('should automatically create a new stock if the symbol does not exist', async () => {
      const newStockSymbol = 'WEGE3';
      await prisma.stock
        .delete({ where: { symbol: newStockSymbol } })
        .catch(() => {});

      const mockBrapiResponse: BrapiResult = {
        symbol: 'WEGE3',
        longName: 'WEG S.A.',
        shortName: 'WEG SA',
        logourl: 'https://s3-symbol-logo.tradingview.com/weg.svg',
        regularMarketPrice: 38.0,
        currency: 'BRL',
        marketCap: 150000000000,
      };
      const brapiSpy = jest
        .spyOn(brapiService, 'getQuote')
        .mockResolvedValue(mockBrapiResponse);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          walletId: testWallet.id,
          stockSymbol: newStockSymbol,
          type: 'BUY',
          quantity: 100,
          price: 38.0,
          executedAt: new Date().toISOString(),
        })
        .expect(201);

      expect(brapiSpy).toHaveBeenCalledWith(newStockSymbol);
      const createdStock = await prisma.stock.findUnique({
        where: { symbol: newStockSymbol },
      });
      expect(createdStock).toBeDefined();
      expect(createdStock?.name).toEqual(mockBrapiResponse.longName);

      brapiSpy.mockRestore();
    });

    it('should delete portfolio item when selling all stocks', async () => {
      const sellAllSymbol = 'ITUB4';
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          walletId: testWallet.id,
          stockSymbol: sellAllSymbol,
          type: 'BUY',
          quantity: 20,
          price: 30.0,
          executedAt: new Date().toISOString(),
        });

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          walletId: testWallet.id,
          stockSymbol: sellAllSymbol,
          type: 'SELL',
          quantity: 20,
          price: 32.0,
          executedAt: new Date().toISOString(),
        })
        .expect(201);

      const portfolioItem = await prisma.portfolioItem.findUnique({
        where: {
          walletId_stockSymbol: {
            walletId: testWallet.id,
            stockSymbol: sellAllSymbol,
          },
        },
      });
      expect(portfolioItem).toBeNull();
    });
  });

  describe('/transactions (GET)', () => {
    it('should return a list of transactions for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const transactions = response.body as Transaction[];
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThanOrEqual(4); // Pelo menos 4 transações foram criadas nos testes de POST
    });

    it('should return 401 Unauthorized if no token is provided', () => {
      return request(app.getHttpServer()).get('/transactions').expect(401);
    });
  });
});
