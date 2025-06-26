import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PrismaModule } from 'src/prisma.module';
import { MarketDataModule } from 'src/market-data/market-data.module';

@Module({
  imports: [PrismaModule, MarketDataModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
