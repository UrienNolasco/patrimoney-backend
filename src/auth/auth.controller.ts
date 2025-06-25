// src/auth/auth.controller.ts
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
import { AuthService } from './auth.service';

import { Response } from 'express';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Rota de Registro
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // A validação do DTO acontece automaticamente pelo NestJS
    const user = await this.authService.createUser(createUserDto);
    // Não retornamos a senha
    const { password, ...result } = user;
    return result;
  }

  // Rota de Login Local (Email/Senha)
  @UseGuards(AuthGuard('local')) // Ativa a LocalStrategy
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // Rota para iniciar o fluxo Google OAuth
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {
    // O Guard redireciona para a página de login do Google
  }

  // Rota de callback do Google
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Request() req, @Res() res: Response) {
    // A GoogleStrategy já fez a validação e o `req.user` agora contém o JWT.
    // Você pode redirecionar o usuário para o frontend com o token.
    const jwt = req.user.access_token;
    res.redirect(`http://localhost:4200/login-success?token=${jwt}`); // Exemplo para Angular/React
  }

  // Rota de exemplo para testar o JWT
  @UseGuards(AuthGuard('jwt')) // Ativa a JwtStrategy, protegendo a rota
  @Get('profile')
  getProfile(@Request() req) {
    // Graças ao JwtStrategy, req.user contém os dados do usuário logado
    return req.user;
  }
}
