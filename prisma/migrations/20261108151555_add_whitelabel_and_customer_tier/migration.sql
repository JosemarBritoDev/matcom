-- CreateEnum
CREATE TYPE "CustomerPricingTier" AS ENUM ('VAREJO', 'ATACADO');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APROVADO', 'PENDENTE', 'REJEITADO');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "pricingTier" "CustomerPricingTier" NOT NULL DEFAULT 'VAREJO',
ADD COLUMN     "requestedBy" TEXT,
ADD COLUMN     "tierStatus" "ApprovalStatus" NOT NULL DEFAULT 'APROVADO';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "accentColor" TEXT DEFAULT '#A855F7',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT DEFAULT '#1E293B',
ADD COLUMN     "welcomeMessage" TEXT DEFAULT 'Bem-vindo ao sistema da sua loja de materiais de construção.';
