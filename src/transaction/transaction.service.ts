import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PrismaService } from 'src/prisma.service';
import { TxType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const { walletId, stockSymbol, quantity, price, type } =
      createTransactionDto;

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet || wallet.userId !== userId) {
      throw new UnauthorizedException('Acesso negado a esta carteira.');
    }

    const stock = await this.prisma.stock.findUnique({
      where: { symbol: stockSymbol },
    });
    if (!stock) {
      throw new NotFoundException(
        `Ativo com o símbolo ${stockSymbol} não encontrado.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 2. (CORREÇÃO) Calcular o campo 'total' antes de criar a transação
      const total = new Decimal(quantity).times(price);

      const transaction = await tx.transaction.create({
        data: {
          ...createTransactionDto,
          total: total, // Adicionar o total calculado
        },
      });

      const portfolioItem = await tx.portfolioItem.findUnique({
        where: {
          walletId_stockSymbol: {
            walletId,
            stockSymbol,
          },
        },
      });

      // Convertendo os inputs (number) para Decimal para os cálculos
      const txQuantity = new Decimal(quantity);
      const txPrice = new Decimal(price);

      if (type === TxType.BUY) {
        if (portfolioItem) {
          // 3. (CORREÇÃO) Usar métodos do Decimal para todos os cálculos
          const oldTotalValue = portfolioItem.quantity.times(
            portfolioItem.avgCost,
          );
          const txValue = txQuantity.times(txPrice);

          const newQuantity = portfolioItem.quantity.plus(txQuantity);
          const newTotalCost = oldTotalValue.plus(txValue);
          const newAvgCost = newTotalCost.div(newQuantity);

          await tx.portfolioItem.update({
            where: { id: portfolioItem.id },
            data: {
              quantity: newQuantity,
              avgCost: newAvgCost,
            },
          });
        } else {
          await tx.portfolioItem.create({
            data: {
              walletId,
              stockSymbol,
              quantity: txQuantity, // Salvar como Decimal
              avgCost: txPrice, // Salvar como Decimal
            },
          });
        }
      } else {
        // Lógica para VENDA (SELL)
        // 3. (CORREÇÃO) Usar métodos do Decimal para comparação e cálculo
        if (!portfolioItem || portfolioItem.quantity.lessThan(txQuantity)) {
          throw new BadRequestException('Quantidade insuficiente para venda.');
        }

        const newQuantity = portfolioItem.quantity.minus(txQuantity);

        if (newQuantity.isZero()) {
          // Usar .isZero() para comparar com 0
          await tx.portfolioItem.delete({ where: { id: portfolioItem.id } });
        } else {
          await tx.portfolioItem.update({
            where: { id: portfolioItem.id },
            data: { quantity: newQuantity },
          });
        }
      }

      return transaction;
    });
  }
}
