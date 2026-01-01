-- CreateTable
CREATE TABLE "AdminCampaignAccess" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminCampaignAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminCampaignAccess_adminId_campaignId_key" ON "AdminCampaignAccess"("adminId", "campaignId");

-- AddForeignKey
ALTER TABLE "AdminCampaignAccess" ADD CONSTRAINT "AdminCampaignAccess_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCampaignAccess" ADD CONSTRAINT "AdminCampaignAccess_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
