import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

import { AuthGuard } from '@nestjs/passport';
import { PortfolioItemEntity } from './entities/portfolio.entity';
import { AuthRequest } from 'src/wallet/wallet.controller';

@UseGuards(AuthGuard('jwt'))
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getPortfolio(@Request() req: AuthRequest): Promise<PortfolioItemEntity[]> {
    return this.portfolioService.getPortfolio(req.user.id);
  }
}
