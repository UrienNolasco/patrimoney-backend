import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateWalletDto {
  // @IsOptional() diz que este campo não é obrigatório na requisição PATCH
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  @Length(3, 100, { message: 'O nome deve ter entre 3 e 100 caracteres.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string | null; // Permite que a descrição seja um texto ou nula
}
