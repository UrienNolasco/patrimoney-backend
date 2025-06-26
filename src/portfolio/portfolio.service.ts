import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { PortfolioItemEntity } from './entities/portfolio.entity';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async getPortfolio(userId: string): Promise<PortfolioItemEntity[]> {
    // 1. Encontrar a carteira do usuário. Usamos 'findUniqueOrThrow' para
    // lançar um erro automaticamente se a carteira não for encontrada.
    const wallet = await this.prisma.wallet
      .findUniqueOrThrow({
        where: { userId },
      })
      .catch(() => {
        throw new NotFoundException(
          'Carteira não encontrada para este usuário.',
        );
      });

    // 2. Buscar todos os itens do portfólio daquela carteira
    const portfolioItems = await this.prisma.portfolioItem.findMany({
      where: { walletId: wallet.id },
      // O 'include' é a chave: ele traz os dados do ativo relacionado
      include: {
        stock: true,
      },
    });

    // 3. Mapear o resultado do Prisma para nossa entidade de resposta limpa
    return portfolioItems.map(
      (item) =>
        new PortfolioItemEntity({
          stockSymbol: item.stockSymbol,
          quantity: item.quantity.toString(),
          avgCost: item.avgCost.toString(),
          stockName: item.stock.name,
          assetClass: item.stock.assetClass,
          logoUrl: item.stock.logoUrl,
        }),
    );
  }
}
