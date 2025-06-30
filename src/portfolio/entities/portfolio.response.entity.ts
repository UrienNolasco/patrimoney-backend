import { PortfolioItemEntity } from './portfolio.entity';

export class PortfolioResponseEntity {
  patrimonio_investido: string; // O totalCost somado de todos os itens
  patrimonio_real: string; // O marketValue somado de todos os itens
  ganho_perda_total: string; // A diferença entre os dois
  ganho_perda_percentual: string; // O ganho/perda percentual total

  items: PortfolioItemEntity[]; // O array de ativos que já tínhamos

  constructor(partial: Partial<PortfolioResponseEntity>) {
    Object.assign(this, partial);
  }
}
