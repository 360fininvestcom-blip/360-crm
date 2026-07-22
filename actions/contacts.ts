"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

export async function getAllContactsForExport(ownerId?: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    let query = Prisma.sql`SELECT * FROM contacts WHERE organization_id = CAST(${session.user.organizationId} AS UUID)`;

    if (ownerId) {
        query = Prisma.sql`${query} AND owner_id = ${ownerId}`;
    }

    const contacts = await prisma.$queryRaw(query);
    return contacts as any[];
}

export async function getContactsForAutoDialer(filters: { search?: string, status?: string, ownerId?: string }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    let query = Prisma.sql`SELECT first_name, last_name, phone FROM contacts WHERE organization_id = CAST(${session.user.organizationId} AS UUID)`;

    if (filters.search) {
        const searchPattern = `%${filters.search}%`;
        query = Prisma.sql`${query} AND (
            first_name ILIKE ${searchPattern} OR 
            last_name ILIKE ${searchPattern} OR 
            email ILIKE ${searchPattern} OR 
            company ILIKE ${searchPattern}
        )`;
    }

    if (filters.status && filters.status !== "all") {
        query = Prisma.sql`${query} AND status = ${filters.status}`;
    }

    if (filters.ownerId) {
        query = Prisma.sql`${query} AND owner_id = ${filters.ownerId}`;
    }

    const contacts = await prisma.$queryRaw(query);
    return contacts as any[];
}

export async function getContactsByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    // Must map ids to Prisma.sql cast if they are UUIDs. 
    // BUT we can use prisma.contact since we don't have complex types, oh wait, Prisma schema is NOT available, we use queryRaw!
    // Since IN clause is tricky with queryRaw and arrays of strings, we'll build it.
    
    // Create an array of parameterized values
    const inList = Prisma.join(ids.map(id => Prisma.sql`CAST(${id} AS UUID)`), ', ');

    const query = Prisma.sql`
        SELECT first_name, last_name, phone 
        FROM contacts 
        WHERE organization_id = CAST(${session.user.organizationId} AS UUID) 
        AND id IN (${inList})
    `;

    const contacts = await prisma.$queryRaw(query);
    return contacts as any[];
}

export async function getContactById(id: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.$queryRaw`
        SELECT * FROM contacts
        WHERE id = CAST(${id} AS UUID)
        AND organization_id = CAST(${session.user.organizationId} AS UUID)
        LIMIT 1
    `;
    
    // @ts-ignore
    return data[0] || null;
}

export async function getActivitiesForContact(contactId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.$queryRaw`
        SELECT 
            a.*,
            json_build_object(
                'full_name', p.full_name,
                'avatar_url', p.avatar_url
            ) as created_by_profile
        FROM activities a
        LEFT JOIN profiles p ON a.created_by = p.id
        WHERE a.contact_id = CAST(${contactId} AS UUID)
        ORDER BY a.created_at DESC
    `;
    
    return data as any[];
}

export async function getDealsForContact(contactId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.$queryRaw`
        SELECT * FROM deals
        WHERE contact_id = CAST(${contactId} AS UUID)
        ORDER BY created_at DESC
    `;
    
    return data as any[];
}

export async function getTasksForContact(contactId: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.$queryRaw`
        SELECT 
            t.*,
            json_build_object(
                'full_name', p.full_name
            ) as assigned_to_profile
        FROM tasks t
        LEFT JOIN profiles p ON t.assigned_to = p.id
        WHERE t.contact_id = CAST(${contactId} AS UUID)
        ORDER BY t.due_date ASC
    `;
    
    return data as any[];
}

export async function addNoteToContact(contactId: string, description: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.$queryRaw`
        INSERT INTO activities (organization_id, contact_id, type, title, description, created_by)
        VALUES (
            CAST(${session.user.organizationId} AS UUID),
            CAST(${contactId} AS UUID),
            'note',
            'Note added',
            ${description},
            CAST(${session.user.id} AS UUID)
        )
        RETURNING *
    `;
    
    // We need to fetch the profile data for this inserted activity to match the return structure
    const activityWithProfile = await prisma.$queryRaw`
        SELECT 
            a.*,
            json_build_object(
                'full_name', p.full_name,
                'avatar_url', p.avatar_url
            ) as created_by_profile
        FROM activities a
        LEFT JOIN profiles p ON a.created_by = p.id
        WHERE a.id = CAST(${(data as any)[0].id} AS UUID)
    `;

    // @ts-ignore
    return activityWithProfile[0];
}

export async function getTestContacts(limit: number = 20) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.$queryRaw`
        SELECT id, first_name, last_name, email 
        FROM contacts
        WHERE organization_id = CAST(${session.user.organizationId} AS UUID)
        ORDER BY first_name ASC
        LIMIT ${limit}
    `;
    
    return data as any[];
}
