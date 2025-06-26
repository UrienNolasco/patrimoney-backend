import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [AuthModule, WalletModule, TransactionModule, PortfolioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
