import { prisma } from "@/lib/prisma";
import { PageClientWrapper } from "./page-client-wrapper";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 3
  });

  const campaigns = await prisma.donationCampaign.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" }
  });

  const serializedPosts = posts.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content,
    coverImageUrl: p.coverImageUrl,
    published: p.published,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString()
  }));

  const serializedCampaigns = campaigns.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    goalAmount: parseFloat(c.goalAmount.toString()),
    currentAmount: parseFloat(c.currentAmount.toString()),
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString()
  }));

  return <PageClientWrapper initialPosts={serializedPosts} initialCampaigns={serializedCampaigns} />;
}
