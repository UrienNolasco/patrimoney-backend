// src/wallet/wallet.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        userId: userId,
      },
    });

    if (!wallet) {
      // Isso não deveria acontecer se a carteira é criada no registro,
      // mas é uma boa prática de segurança verificar.
      throw new NotFoundException('Carteira não encontrada para este usuário.');
    }

    return wallet;
  }

  async updateWalletByUserId(
    userId: string,
    updateWalletDto: UpdateWalletDto,
  ): Promise<Wallet> {
    // O 'findUnique' garante que o usuário está atualizando sua própria carteira
    // O Prisma lançará um erro se a carteira com o userId não for encontrada.
    return this.prisma.wallet.update({
      where: {
        userId: userId,
      },
      data: updateWalletDto,
    });
  }
}
