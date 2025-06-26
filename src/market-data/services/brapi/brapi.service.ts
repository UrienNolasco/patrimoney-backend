import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  BrapiQuoteResponseDto,
  BrapiResult,
} from 'src/market-data/dto/brapi-quote.response.dto';
import { AppLoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class BrapiService {
  private readonly baseUrl = 'https://brapi.dev/api';
  private readonly token: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.token = this.configService.get<string>('BRAPI_API_KEY')!;
  }

  async getQuote(ticker: string): Promise<BrapiResult | null> {
    const url = `${this.baseUrl}/quote/${ticker}`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<BrapiQuoteResponseDto>(url, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
      );

      if (response.data && response.data.results.length > 0) {
        return response.data.results[0];
      }
      return null;
    } catch (error: unknown) {
      this.logger.error(`Failed to fetch quote for ${ticker}`, error);
      return null;
    }
  }
}
