-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('ACAO', 'FII', 'BDR', 'RENDA_FIXA', 'FUNDO', 'ETF', 'CRIPTO', 'COMMODITY', 'OPCAO', 'FUTURO', 'OUTROS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Carteira Principal',
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "exchange" TEXT,
    "assetClass" "AssetClass" NOT NULL DEFAULT 'ACAO',
    "cnpj" TEXT,
    "isin" TEXT,
    "sector" TEXT,
    "segment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "website" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "avgCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(15,2),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "price" DECIMAL(15,4) NOT NULL,
    "total" DECIMAL(15,2) NOT NULL,
    "fees" DECIMAL(10,2) DEFAULT 0,
    "notes" TEXT,
    "brokerage" TEXT,
    "operationId" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_cache" (
    "stockSymbol" TEXT NOT NULL,
    "price" DECIMAL(15,4) NOT NULL,
    "previousClose" DECIMAL(15,4),
    "change" DECIMAL(10,4),
    "changePercent" DECIMAL(6,4),
    "volume" BIGINT,
    "marketCap" DECIMAL(20,2),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_cache_pkey" PRIMARY KEY ("stockSymbol")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investedValue" DECIMAL(15,2) NOT NULL,
    "marketValue" DECIMAL(15,2) NOT NULL,
    "totalDividends" DECIMAL(15,2) DEFAULT 0,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_items" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "avgCost" DECIMAL(15,4) NOT NULL,
    "currentPrice" DECIMAL(15,4) NOT NULL,
    "currentValue" DECIMAL(15,2) NOT NULL,
    "totalDividends" DECIMAL(10,2) DEFAULT 0,

    CONSTRAINT "snapshot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividends" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "valuePerShare" DECIMAL(10,4) NOT NULL,
    "totalValue" DECIMAL(15,2) NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "exDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "recordDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DECIMAL(15,2) NOT NULL,
    "currentValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_stocks" (
    "categoryId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_stocks_pkey" PRIMARY KEY ("categoryId","stockSymbol")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "stocks_assetClass_idx" ON "stocks"("assetClass");

-- CreateIndex
CREATE INDEX "stocks_sector_idx" ON "stocks"("sector");

-- CreateIndex
CREATE INDEX "stocks_isActive_idx" ON "stocks"("isActive");

-- CreateIndex
CREATE INDEX "portfolio_items_walletId_idx" ON "portfolio_items"("walletId");

-- CreateIndex
CREATE INDEX "portfolio_items_stockSymbol_idx" ON "portfolio_items"("stockSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_items_walletId_stockSymbol_key" ON "portfolio_items"("walletId", "stockSymbol");

-- CreateIndex
CREATE INDEX "transactions_walletId_executedAt_idx" ON "transactions"("walletId", "executedAt" DESC);

-- CreateIndex
CREATE INDEX "transactions_stockSymbol_executedAt_idx" ON "transactions"("stockSymbol", "executedAt");

-- CreateIndex
CREATE INDEX "transactions_type_executedAt_idx" ON "transactions"("type", "executedAt");

-- CreateIndex
CREATE INDEX "transactions_brokerage_idx" ON "transactions"("brokerage");

-- CreateIndex
CREATE INDEX "quote_cache_fetchedAt_idx" ON "quote_cache"("fetchedAt");

-- CreateIndex
CREATE INDEX "snapshots_walletId_createdAt_idx" ON "snapshots"("walletId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "snapshot_items_snapshotId_idx" ON "snapshot_items"("snapshotId");

-- CreateIndex
CREATE INDEX "snapshot_items_stockSymbol_idx" ON "snapshot_items"("stockSymbol");

-- CreateIndex
CREATE INDEX "dividends_walletId_paymentDate_idx" ON "dividends"("walletId", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "dividends_stockSymbol_paymentDate_idx" ON "dividends"("stockSymbol", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "dividends_exDate_idx" ON "dividends"("exDate");

-- CreateIndex
CREATE INDEX "goals_walletId_idx" ON "goals"("walletId");

-- CreateIndex
CREATE INDEX "goals_targetDate_idx" ON "goals"("targetDate");

-- CreateIndex
CREATE INDEX "categories_walletId_idx" ON "categories"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_walletId_name_key" ON "categories"("walletId", "name");

-- CreateIndex
CREATE INDEX "audit_logs_walletId_createdAt_idx" ON "audit_logs"("walletId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_cache" ADD CONSTRAINT "quote_cache_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_items" ADD CONSTRAINT "snapshot_items_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_items" ADD CONSTRAINT "snapshot_items_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_stocks" ADD CONSTRAINT "category_stocks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_stocks" ADD CONSTRAINT "category_stocks_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
