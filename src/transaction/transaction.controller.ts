import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRequest } from 'src/wallet/wallet.controller';

@UseGuards(AuthGuard('jwt'))
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(
    @Request() req: AuthRequest,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    // Passamos o DTO e o ID do usuário logado para o serviço
    return this.transactionService.create(createTransactionDto, req.user.id);
  }
  @Get()
  findAll(@Request() req: AuthRequest) {
    // A lógica de negócio está no serviço, o controller apenas repassa a chamada.
    return this.transactionService.findAllByUserId(req.user.id);
  }
}
