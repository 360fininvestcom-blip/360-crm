import { prisma } from "@/lib/prisma";
import { PageClientWrapper } from "./page-client-wrapper";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let announcements: any[] = [];
  let campaigns: any[] = [];

  try {
    announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 3
    });
  } catch (err) {
    console.error("Failed to fetch announcements from DB:", err);
  }

  try {
    campaigns = await prisma.salesCampaign.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
  } catch (err) {
    console.error("Failed to fetch campaigns from DB:", err);
  }

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
