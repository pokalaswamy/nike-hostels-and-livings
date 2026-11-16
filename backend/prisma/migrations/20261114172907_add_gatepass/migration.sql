-- CreateEnum
CREATE TYPE "GatePassStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "GatePass" (
    "id" SERIAL NOT NULL,
    "studentName" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "departureDate" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "returnDate" TEXT NOT NULL,
    "returnTime" TEXT NOT NULL,
    "status" "GatePassStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatePass_pkey" PRIMARY KEY ("id")
);
