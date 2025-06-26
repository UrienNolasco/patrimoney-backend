import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TxType } from '@prisma/client';

export class CreateTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsNotEmpty()
  stockSymbol: string;

  @IsEnum(TxType)
  @IsNotEmpty()
  type: TxType; // Deve ser 'BUY' ou 'SELL'

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number; // Preço por unidade do ativo

  @IsDateString()
  executedAt: string; // Data em que a operação foi realizada

  @IsNumber()
  @IsOptional()
  @Min(0)
  fees?: number; // Taxas opcionais
}
