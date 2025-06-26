import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { AuthGuard } from '@nestjs/passport';

// Definir a interface para a requisição com o usuário autenticado
// (Você pode mover isso para um arquivo de tipos compartilhado no futuro)
import { Request as ExpressRequest } from 'express';
import { UserWithoutPassword } from 'src/auth/auth.service';
interface AuthRequest extends ExpressRequest {
  user: UserWithoutPassword;
}

@UseGuards(AuthGuard('jwt')) // Proteger todas as rotas deste controller
@Controller('wallet') // Usamos a rota no singular: /wallet
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // Rota para buscar a carteira do usuário logado
  @Get()
  findOne(@Request() req: AuthRequest) {
    // Passamos o ID do usuário logado para o serviço
    return this.walletService.getWalletByUserId(req.user.id);
  }

  // Rota para atualizar a carteira do usuário logado
  @Patch()
  update(
    @Request() req: AuthRequest,
    @Body() updateWalletDto: UpdateWalletDto,
  ) {
    return this.walletService.updateWalletByUserId(
      req.user.id,
      updateWalletDto,
    );
  }
}
