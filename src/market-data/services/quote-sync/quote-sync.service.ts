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
      try {
        const quote = await this.brapiService.getQuote(stock.symbol);
        if (quote) {
          await this.prisma.quoteCache.upsert({
            where: { stockSymbol: stock.symbol },
            update: {
              price: quote.regularMarketPrice,
              fetchedAt: new Date(),
            },
            create: {
              stockSymbol: stock.symbol,
              price: quote.regularMarketPrice,
            },
          });
          this.logger.log(`Synced quote for ${stock.symbol}`);
        }
      } catch (error) {
        this.logger.error(`Error syncing ${stock.symbol}`, error);
      }
    }

    this.logger.log('Sync process finished.');
  }
}
