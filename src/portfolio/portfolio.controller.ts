import {
  Controller,
  Get,
  UseGuards,
  Request,
  Post,
  HttpCode,
  Query,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

import { AuthGuard } from '@nestjs/passport';
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
  getPortfolio(
    @Request() req: AuthRequest,
    @Query('summary') summary?: string,
  ) {
    // Convertemos a string 'true' para um booleano
    const apenassumo = summary === 'true';
    return this.portfolioService.getPortfolio(req.user.id, apenassumo);
  }

  @Post('refresh')
  @HttpCode(202)
  refreshPortfolio() {
    void this.quoteSyncService.syncAllQuotes();

    return { message: 'A sincronização de cotações foi iniciada.' };
  }
}
