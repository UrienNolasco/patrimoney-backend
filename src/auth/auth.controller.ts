import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Body,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest, Response } from 'express';
import { AuthService, JwtPayload, UserWithoutPassword } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';

// 2. (BOA PRÁTICA) Definir interfaces para nossas requisições tipadas
interface AuthRequest extends ExpressRequest {
  user: UserWithoutPassword; // Para LocalAuthGuard e JwtAuthGuard
}

interface GoogleAuthRequest extends ExpressRequest {
  user: JwtPayload; // Para GoogleAuthGuard
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.createUser(createUserDto);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  // 3. (CORREÇÃO) Tipar 'req' e remover 'async'
  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req: AuthRequest) {
    // req.user agora é 'UserWithoutPassword', que é o tipo que this.authService.login espera.
    // O método login do serviço é síncrono, então removemos 'async' daqui.
    return this.authService.login(req.user);
  }

  // 4. (CORREÇÃO) Remover 'req' não utilizado
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // O Guard faz todo o trabalho de redirecionamento. O corpo pode ser vazio.
  }

  // 5. (CORREÇÃO) Tipar 'req' e usar desestruturação
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Request() req: GoogleAuthRequest, @Res() res: Response) {
    // req.user agora é 'JwtPayload' { access_token: string }
    const { access_token } = req.user;
    res.redirect(`http://localhost:4200/login-success?token=${access_token}`);
  }

  // 6. (CORREÇÃO) Tipar 'req' para obter o perfil do usuário
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: AuthRequest): UserWithoutPassword {
    // req.user agora é 'UserWithoutPassword', que foi retornado pela JwtStrategy
    return req.user;
  }
}
