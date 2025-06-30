-- DropForeignKey
ALTER TABLE "quote_cache" DROP CONSTRAINT "quote_cache_stockSymbol_fkey";

-- AddForeignKey
ALTER TABLE "quote_cache" ADD CONSTRAINT "quote_cache_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE CASCADE ON UPDATE CASCADE;
