import { Module } from '@nestjs/common';
import { BrapiService } from './services/brapi/brapi.service';
import { HttpModule } from '@nestjs/axios';
import { QuoteSyncService } from './services/quote-sync/quote-sync.service';
import { PrismaModule } from 'src/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [BrapiService, QuoteSyncService],
  exports: [BrapiService, QuoteSyncService],
})
export class MarketDataModule {}
