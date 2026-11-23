/*
  Warnings:

  - You are about to drop the column `description` on the `Group` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `GroupMember` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Group" DROP COLUMN "description";

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_userId_key" ON "GroupMember"("userId");
