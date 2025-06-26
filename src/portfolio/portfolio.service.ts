import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { PortfolioItemEntity } from './entities/portfolio.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async getPortfolio(userId: string): Promise<PortfolioItemEntity[]> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Carteira não encontrada para este usuário.');
    }

    const portfolioItems = await this.prisma.portfolioItem.findMany({
      where: { walletId: wallet.id },
      include: { stock: true },
    });

    if (portfolioItems.length === 0) {
      return [];
    }

    const symbols = portfolioItems.map((item) => item.stockSymbol);

    const quotes = await this.prisma.quoteCache.findMany({
      where: { stockSymbol: { in: symbols } },
    });

    const quoteMap = new Map(quotes.map((q) => [q.stockSymbol, q.price]));

    const portfolioEntities = portfolioItems.map(
      (item): PortfolioItemEntity => {
        // (CORREÇÃO) Tipamos explicitamente cada constante para guiar o TypeScript

        const currentPrice: Prisma.Decimal =
          quoteMap.get(item.stockSymbol) ?? new Prisma.Decimal(0);

        const quantity: Prisma.Decimal = item.quantity;
        const avgCost: Prisma.Decimal = item.avgCost;

        const totalCost: Prisma.Decimal = quantity.times(avgCost);
        const marketValue: Prisma.Decimal = quantity.times(currentPrice);
        const gainLoss: Prisma.Decimal = marketValue.minus(totalCost);

        const gainLossPercent: Prisma.Decimal = totalCost.isZero()
          ? new Prisma.Decimal(0)
          : gainLoss.div(totalCost).times(100);

        // Usamos toFixed() apenas no final, para a serialização
        return new PortfolioItemEntity({
          stockSymbol: item.stockSymbol,
          quantity: quantity.toFixed(4),
          avgCost: avgCost.toFixed(2), // Preço médio geralmente com 2 casas
          stockName: item.stock.name,
          assetClass: item.stock.assetClass,
          logoUrl: item.stock.logoUrl,
          currentPrice: currentPrice.toFixed(2),
          marketValue: marketValue.toFixed(2),
          totalCost: totalCost.toFixed(2),
          gainLoss: gainLoss.toFixed(2),
          gainLossPercent: gainLossPercent.toFixed(2),
        });
      },
    );

    return portfolioEntities;
  }
}
