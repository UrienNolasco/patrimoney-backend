export class BrapiResult {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  marketCap: number;
  logourl: string;
}

export class BrapiQuoteResponseDto {
  results: BrapiResult[];
}
