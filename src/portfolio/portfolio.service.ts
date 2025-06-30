// src/portfolio/portfolio.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';

import { PortfolioItemEntity } from './entities/portfolio.entity';
import { Prisma } from '@prisma/client';
import { PortfolioResponseEntity } from './entities/portfolio.response.entity';
import { PortfolioSummaryEntity } from './entities/portfolio-summary.entity';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca o portfólio consolidado do usuário.
   * @param userId O ID do usuário logado.
   * @param summaryOnly Se true, retorna apenas os totais do portfólio.
   * @returns O portfólio completo ou apenas o sumário.
   */
  async getPortfolio(
    userId: string,
    summaryOnly: boolean,
  ): Promise<PortfolioResponseEntity | PortfolioSummaryEntity> {
    const wallet = await this.prisma.wallet
      .findUniqueOrThrow({
        where: { userId },
      })
      .catch(() => {
        // O .catch() é útil para customizar a mensagem de erro do findUniqueOrThrow
        throw new NotFoundException(
          'Carteira não encontrada para este usuário.',
        );
      });

    const portfolioItems = await this.prisma.portfolioItem.findMany({
      where: { walletId: wallet.id },
      include: { stock: true },
    });

    // Cria um objeto de sumário zerado para ser usado em múltiplos cenários
    const zeroedSummary: PortfolioSummaryEntity = {
      patrimonio_investido: '0.00',
      patrimonio_real: '0.00',
      ganho_perda_total: '0.00',
      ganho_perda_percentual: '0.00',
    };

    // Se não há itens no portfólio, retorna os valores zerados
    if (portfolioItems.length === 0) {
      if (summaryOnly) {
        return zeroedSummary;
      }
      return new PortfolioResponseEntity({ ...zeroedSummary, items: [] });
    }

    // --- A LÓGICA DE CÁLCULO (PERMANECE A MESMA) ---
    const symbols = portfolioItems.map((item) => item.stockSymbol);
    const quotes = await this.prisma.quoteCache.findMany({
      where: { stockSymbol: { in: symbols } },
    });
    const quoteMap = new Map(quotes.map((q) => [q.stockSymbol, q.price]));

    const itemsComValores = portfolioItems.map((item) => {
      const currentPrice =
        quoteMap.get(item.stockSymbol) ?? new Prisma.Decimal(0);
      const totalCost = item.quantity.times(item.avgCost);
      const marketValue = item.quantity.times(currentPrice);
      return { ...item, totalCost, marketValue, currentPrice };
    });

    const totais = itemsComValores.reduce(
      (acc, item) => {
        acc.totalInvestido = acc.totalInvestido.plus(item.totalCost);
        acc.patrimonioReal = acc.patrimonioReal.plus(item.marketValue);
        return acc;
      },
      {
        totalInvestido: new Prisma.Decimal(0),
        patrimonioReal: new Prisma.Decimal(0),
      },
    );
    // --- FIM DA LÓGICA DE CÁLCULO ---

    const ganhoPerdaTotal = totais.patrimonioReal.minus(totais.totalInvestido);
    const ganhoPerdaPercentual = totais.totalInvestido.isZero()
      ? new Prisma.Decimal(0)
      : ganhoPerdaTotal.div(totais.totalInvestido).times(100);

    // Monta o objeto de sumário com os dados calculados e formatados
    const summaryData: PortfolioSummaryEntity = {
      patrimonio_investido: totais.totalInvestido.toFixed(2),
      patrimonio_real: totais.patrimonioReal.toFixed(2),
      ganho_perda_total: ganhoPerdaTotal.toFixed(2),
      ganho_perda_percentual: ganhoPerdaPercentual.toFixed(2),
    };

    // =======================================================
    // (NOVO) LÓGICA DE RETORNO CONDICIONAL
    // =======================================================
    if (summaryOnly) {
      return summaryData;
    }

    // Se a resposta completa for solicitada, formata a lista de itens
    const itemsFormatados = itemsComValores.map((item) => {
      const gainLoss = item.marketValue.minus(item.totalCost);
      const gainLossPercent = item.totalCost.isZero()
        ? new Prisma.Decimal(0)
        : gainLoss.div(item.totalCost).times(100);

      return new PortfolioItemEntity({
        stockSymbol: item.stockSymbol,
        quantity: item.quantity.toFixed(4),
        avgCost: item.avgCost.toFixed(2),
        stockName: item.stock.name,
        logoUrl: item.stock.logoUrl,
        assetClass: item.stock.assetClass,
        currentPrice: item.currentPrice.toFixed(2),
        marketValue: item.marketValue.toFixed(2),
        totalCost: item.totalCost.toFixed(2),
        gainLoss: gainLoss.toFixed(2),
        gainLossPercent: gainLossPercent.toFixed(2),
      });
    });

    // Monta e retorna o objeto de resposta final e completo
    return new PortfolioResponseEntity({
      ...summaryData,
      items: itemsFormatados,
    });
  }
}
