import { prisma } from "@/lib/prisma";
import { PageClientWrapper } from "./page-client-wrapper";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const announcements = await prisma.announcement.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 3
  });

  const campaigns = await prisma.salesCampaign.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" }
  });

  const serializedAnnouncements = announcements.map(a => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    content: a.content,
    coverImageUrl: a.coverImageUrl,
    published: a.published,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString()
  }));

  const serializedCampaigns = campaigns.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    targetRevenue: parseFloat(c.targetRevenue.toString()),
    currentRevenue: parseFloat(c.currentRevenue.toString()),
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString()
  }));

  return <PageClientWrapper initialPosts={serializedAnnouncements} initialCampaigns={serializedCampaigns} />;
}
