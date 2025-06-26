import {
  Controller,
  Get,
  UseGuards,
  Request,
  Post,
  HttpCode,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

import { AuthGuard } from '@nestjs/passport';
import { PortfolioItemEntity } from './entities/portfolio.entity';
import { AuthRequest } from 'src/wallet/wallet.controller';
import { QuoteSyncService } from 'src/market-data/services/quote-sync/quote-sync.service';

@UseGuards(AuthGuard('jwt'))
@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly quoteSyncService: QuoteSyncService,
    private readonly portfolioService: PortfolioService,
  ) {}

  @Get()
  getPortfolio(@Request() req: AuthRequest): Promise<PortfolioItemEntity[]> {
    return this.portfolioService.getPortfolio(req.user.id);
  }

  @Post('refresh')
  @HttpCode(202)
  refreshPortfolio() {
    void this.quoteSyncService.syncAllQuotes();

    return { message: 'A sincronização de cotações foi iniciada.' };
  }
}
