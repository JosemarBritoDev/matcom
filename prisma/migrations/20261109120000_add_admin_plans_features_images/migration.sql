-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('FREE', 'START', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ATIVO', 'SUSPENSO');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "status" "TenantStatus" NOT NULL DEFAULT 'ATIVO';

-- AlterTable
ALTER TABLE "TenantModule" ADD COLUMN     "orcamentos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "expedicao" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "comprasCurvaAbc" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emissaoFiscalSefaz" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imageUrl" TEXT;
