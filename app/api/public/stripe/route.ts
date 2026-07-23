import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Webhook endpoint to receive payments (Stripe/PayPal simulated webhook payload)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("DEBUG: Received donation payment webhook payload:", body);

        // Required fields from stripe payment intent or checkout session success
        const email = body.email || body.data?.object?.customer_details?.email || body.customer_email;
        const amountCents = body.amount || body.data?.object?.amount_total || body.amount_total;
        const fullName = body.name || body.data?.object?.customer_details?.name || body.customer_name || "Anonymous Donor";
        const campaignId = body.campaignId || body.data?.object?.metadata?.campaignId || body.metadata?.campaignId;

        if (!email || !amountCents) {
            return NextResponse.json({ error: "Missing required donor email or amount" }, { status: 400 });
        }

        const amount = parseFloat((amountCents / 100).toFixed(2));

        // 1. Fetch first organization in CRM
        const org = await prisma.organization.findFirst();
        if (!org) {
            return NextResponse.json({ error: "No organization configured in CRM" }, { status: 400 });
        }

        // 2. Resolve or create Contact
        let contact = await prisma.contact.findFirst({
            where: {
                email,
                organizationId: org.id
            }
        });

        if (!contact) {
            const nameParts = fullName.split(" ");
            const firstName = nameParts[0] || "Anonymous";
            const lastName = nameParts.slice(1).join(" ") || "Donor";

            contact = await prisma.contact.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    organizationId: org.id,
                    tags: ["Donor", "Web Checkout"],
                    source: "Stripe Donation",
                    customFields: {
                        status: "Donor"
                    }
                }
            });
        } else {
            // Append Donor tag if not present
            if (!contact.tags.includes("Donor")) {
                await prisma.contact.update({
                    where: { id: contact.id },
                    data: {
                        tags: {
                            set: [...contact.tags, "Donor"]
                        }
                    }
                });
            }
        }

        // 3. Find default Pipeline
        const pipeline = await prisma.pipeline.findFirst({
            where: { organizationId: org.id }
        });

        if (!pipeline) {
            return NextResponse.json({ error: "No pipeline configured for deals" }, { status: 400 });
        }

        // Stage can be first stage or default closed-won stage
        let defaultStage = "Closed Won";
        try {
            const stages = JSON.parse(pipeline.stages as string);
            if (stages && stages.length > 0) {
                const wonStage = stages.find((s: any) => s.name.toLowerCase().includes("won") || s.name.toLowerCase().includes("closed"));
                if (wonStage) defaultStage = wonStage.name;
                else defaultStage = stages[stages.length - 1].name;
            }
        } catch (e) {
            console.log("DEBUG: stages parse failed, using fallback Closed Won stage name");
        }

        // 4. Create Donation Deal
        const deal = await prisma.deal.create({
            data: {
                organizationId: org.id,
                contactId: contact.id,
                pipelineId: pipeline.id,
                name: `Donation: $${amount} - ${contact.firstName} ${contact.lastName || ""}`.trim(),
                value: amount,
                stage: defaultStage,
                probability: 100
            }
        });

        // 5. Create Activity log
        await prisma.activity.create({
            data: {
                organizationId: org.id,
                contactId: contact.id,
                dealId: deal.id,
                type: "system",
                title: "Donation Received",
                description: `Successfully processed Stripe payment of $${amount.toFixed(2)} from ${fullName} (${email}).`
            }
        });

        // 6. Update Donation Campaign progress if applicable
        if (campaignId) {
            try {
                const campaign = await prisma.donationCampaign.findFirst({
                    where: {
                        id: campaignId,
                        organizationId: org.id
                    }
                });
                if (campaign) {
                    const currentAmount = parseFloat(campaign.currentAmount.toString()) + amount;
                    await prisma.donationCampaign.update({
                        where: { id: campaign.id },
                        data: {
                            currentAmount
                        }
                    });
                }
            } catch (campErr) {
                console.error("Failed to update campaign current raised amount:", campErr);
            }
        }

        return NextResponse.json({ success: true, dealId: deal.id }, { status: 200 });

    } catch (error: unknown) {
        console.error("Stripe Webhook API Error:", error);
        const err = error as any;
        return NextResponse.json(
            {
                error: (err?.message || "Internal Server Error"),
                stack: err?.stack
            },
            { status: 500 }
        );
    }
}
