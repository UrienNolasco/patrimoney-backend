import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { BrapiService } from '../brapi/brapi.service';
import { Cron } from '@nestjs/schedule';
import { AppLoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class QuoteSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brapiService: BrapiService,
    private readonly logger: AppLoggerService,
  ) {}

  @Cron('0 10 * * 1-5', { timeZone: 'America/Sao_Paulo' })
  handleMorningSync() {
    this.logger.log('Running morning quote sync...');
    void this.syncAllQuotes();
  }

  @Cron('0 15 * * 1-5', { timeZone: 'America/Sao_Paulo' })
  handleAfternoonSync() {
    this.logger.log('Running afternoon quote sync...');
    void this.syncAllQuotes();
  }

  @Cron('30 17 * * 1-5', { timeZone: 'America/Sao_Paulo' })
  handleClosingSync() {
    this.logger.log('Running closing quote sync...');
    void this.syncAllQuotes();
  }

  async syncAllQuotes() {
    this.logger.log('Starting sync process for all tracked stocks.');
    const stocks = await this.prisma.stock.findMany({
      select: { symbol: true },
    });

    for (const stock of stocks) {
      const quote = await this.brapiService.getQuote(stock.symbol);
      if (quote) {
        // Envolver as duas atualizações em uma transação para garantir consistência
        await this.prisma.$transaction([
          // Ação 1: Atualizar o cache de cotações (como antes)
          this.prisma.quoteCache.upsert({
            where: { stockSymbol: stock.symbol },
            update: { price: quote.regularMarketPrice },
            create: {
              stockSymbol: stock.symbol,
              price: quote.regularMarketPrice,
            },
          }),

          // 2. (NOVO) Ação 2: Atualizar a tabela Stock com metadados
          this.prisma.stock.update({
            where: { symbol: stock.symbol },
            data: {
              // Apenas atualiza se a Brapi fornecer um novo valor
              name: quote.longName ?? undefined,
              logoUrl: quote.logourl ?? undefined,
            },
          }),
        ]);
        this.logger.log(`Synced data for ${stock.symbol}`);
      }
    }
    this.logger.log('Sync process finished.');
  }
}
