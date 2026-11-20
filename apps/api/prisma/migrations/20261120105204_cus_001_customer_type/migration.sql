-- CreateEnum
CREATE TYPE "customer_type" AS ENUM ('PAINTER', 'CUSTOMER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "customer_type" "customer_type";
