import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { Transaction, User, Wallet } from '@prisma/client';
import { createTestApp } from './setup';
import { PrismaService } from 'src/prisma.service';
import { JwtPayload } from 'src/auth/auth.service';
import { BrapiService } from 'src/market-data/services/brapi/brapi.service';
import { BrapiResult } from 'src/market-data/dto/brapi-quote.response.dto';

describe('TransactionController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let brapiService: BrapiService;
  let testUser: User & { wallet: Wallet };
  let testWallet: Wallet;

  const txUserDto = {
    email: `tx.e2e.${Date.now()}@example.com`,
    password: 'e2e-tx-password',
  };

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    brapiService = app.get<BrapiService>(BrapiService);

    const hashedPassword = await bcrypt.hash(txUserDto.password, 10);
    testUser = (await prisma.user.create({
      data: {
        ...txUserDto,
        password: hashedPassword,
        wallet: { create: { name: 'TX Test Wallet' } },
      },
      // O include garante que a resposta contenha a carteira
      include: { wallet: true },
    })) as User & { wallet: Wallet };
    // Como o 'include' foi usado, testUser.wallet não será nulo
    testWallet = testUser.wallet;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(txUserDto);

    // 3. (CORREÇÃO) Tipar o corpo da resposta do login antes de acessar
    const loginBody = loginResponse.body as JwtPayload;
    authToken = loginBody.access_token;
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await app.close();
  });

  describe('/transactions (POST)', () => {
    const stockSymbol = 'PETR4'; // Assumindo que PETR4 existe no banco

    it('should register the first BUY transaction and create a portfolio item', async () => {
      const createTxDto = {
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
        .send(createTxDto)
        .expect(201);

      // Verificação no banco de dados
      const portfolioItem = await prisma.portfolioItem.findUnique({
        where: {
          walletId_stockSymbol: { walletId: testWallet.id, stockSymbol },
        },
      });

      expect(portfolioItem).toBeDefined();
      expect(portfolioItem!.quantity.toNumber()).toBe(10);
      expect(portfolioItem!.avgCost.toNumber()).toBe(35.5);
    });

    it('should automatically create a new stock if the symbol does not exist', async () => {
      const newStockSymbol = 'WEGE3'; // Um ativo que ainda não existe no DB

      // 1. Setup do Mock: Simular a resposta da Brapi para 'WEGE3'
      const mockBrapiResponse: BrapiResult = {
        symbol: 'WEGE3',
        longName: 'WEG S.A.',
        shortName: 'WEG SA',
        logourl: 'https://s3-symbol-logo.tradingview.com/weg.svg',
        regularMarketPrice: 35.0,
        currency: 'BRL',
        marketCap: 147000000000,
      };

      // Usamos jest.spyOn para interceptar a chamada ao método real
      const brapiSpy = jest
        .spyOn(brapiService, 'getQuote')
        .mockResolvedValue(mockBrapiResponse);

      const createTxDto = {
        walletId: testWallet.id,
        stockSymbol: newStockSymbol,
        type: 'BUY',
        quantity: 10,
        price: 35.0,
        executedAt: new Date().toISOString(),
      };

      // 2. Ação: Fazer a requisição que irá disparar a lógica
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTxDto)
        .expect(201);

      // 3. Verificações
      // a) Verificar se o nosso serviço da Brapi foi chamado com o ticker correto
      expect(brapiSpy).toHaveBeenCalledWith(newStockSymbol);

      // b) Verificar se o ativo foi realmente criado no nosso banco de dados
      const createdStock = await prisma.stock.findUnique({
        where: { symbol: newStockSymbol },
      });
      expect(createdStock).toBeDefined();
      expect(createdStock?.name).toEqual(mockBrapiResponse.longName);

      // c) Verificar se o item de portfólio também foi criado
      const portfolioItem = await prisma.portfolioItem.findUnique({
        where: {
          walletId_stockSymbol: {
            walletId: testWallet.id,
            stockSymbol: newStockSymbol,
          },
        },
      });
      expect(portfolioItem).toBeDefined();
      expect(portfolioItem?.quantity.toNumber()).toBe(10);

      // Limpar o mock para não afetar outros testes
      brapiSpy.mockRestore();
    });

    it('should register a second BUY and correctly update the avgCost', async () => {
      const createTxDto = {
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
        .send(createTxDto)
        .expect(201);

      const portfolioItem = await prisma.portfolioItem.findUnique({
        where: {
          walletId_stockSymbol: { walletId: testWallet.id, stockSymbol },
        },
      });

      // Cálculo esperado: (10*35 + 5*37) / 15 = 36
      expect(portfolioItem!.quantity.toNumber()).toBe(15);
      expect(portfolioItem!.avgCost.toNumber()).toBe(36);
    });

    it('should register a SELL transaction and update quantity', async () => {
      const createTxDto = {
        walletId: testWallet.id,
        stockSymbol,
        type: 'SELL',
        quantity: 8,
        price: 40.0,
        executedAt: new Date().toISOString(),
      };

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTxDto)
        .expect(201);

      const portfolioItem = await prisma.portfolioItem.findUnique({
        where: {
          walletId_stockSymbol: { walletId: testWallet.id, stockSymbol },
        },
      });

      expect(portfolioItem!.quantity.toNumber()).toBe(7); // 15 - 8 = 7
      expect(portfolioItem!.avgCost.toNumber()).toBe(36); // Preço médio não muda na venda
    });

    it('should fail to SELL if quantity is insufficient', () => {
      const createTxDto = {
        walletId: testWallet.id,
        stockSymbol,
        type: 'SELL',
        quantity: 1000, // Mais do que o usuário possui (7)
        price: 40.0,
        executedAt: new Date().toISOString(),
      };

      return request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTxDto)
        .expect(400); // Bad Request
    });

    it('should delete portfolio item when selling all stocks', async () => {
      const createTxDto = {
        walletId: testWallet.id,
        stockSymbol,
        type: 'SELL',
        quantity: 7, // Vender a quantidade exata restante
        price: 42.0,
        executedAt: new Date().toISOString(),
      };

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTxDto)
        .expect(201);

      const portfolioItem = await prisma.portfolioItem.findUnique({
        where: {
          walletId_stockSymbol: { walletId: testWallet.id, stockSymbol },
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
      // A quantidade exata pode variar dependendo da ordem,
      // então é melhor verificar se há pelo menos uma.
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[0].stockSymbol).toBeDefined();
    });

    it('should return 401 Unauthorized if no token is provided', () => {
      return request(app.getHttpServer()).get('/transactions').expect(401);
    });
  });
});
