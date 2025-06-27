import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { PrismaModule } from 'src/prisma.module';
import { MarketDataModule } from 'src/market-data/market-data.module';

@Module({
  imports: [PrismaModule, MarketDataModule],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
