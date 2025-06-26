import { AssetClass } from '@prisma/client';

// Usaremos esta classe para garantir uma resposta fortemente tipada do nosso endpoint.
export class PortfolioItemEntity {
  stockSymbol: string;
  quantity: string;
  avgCost: string;

  stockName: string;
  assetClass: AssetClass;
  logoUrl: string | null;

  constructor(partial: Partial<PortfolioItemEntity>) {
    Object.assign(this, partial);
  }
}
