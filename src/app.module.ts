import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { MarketDataModule } from './market-data/market-data.module';
import { AppLoggerService } from './common/logger/logger.service';

@Module({
  imports: [
    AuthModule,
    WalletModule,
    TransactionModule,
    PortfolioModule,
    ScheduleModule.forRoot(),
    HttpModule,
    MarketDataModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppLoggerService],
  exports: [AppLoggerService],
})
export class AppModule {}
