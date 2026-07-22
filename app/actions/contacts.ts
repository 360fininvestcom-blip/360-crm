"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Contact, ContactStatus } from "@/types";

async function getSession() {
    return await auth.api.getSession({
        headers: await headers(),
    });
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    ownerId?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export async function fetchContacts(): Promise<Contact[]> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    
    return await prisma.contact.findMany({
        orderBy: { createdAt: "desc" }
    });
}

export async function fetchContactsPaginated(params: PaginationParams): Promise<PaginatedResult<Contact>> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const { page = 1, limit = 50, search, status, ownerId } = params;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (ownerId && ownerId !== "all") {
        where.ownerId = ownerId;
    }

    if (search) {
        where.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
        ];
    }

    if (status) {
        where.status = status;
    }

    const [data, total] = await Promise.all([
        prisma.contact.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: offset,
            take: limit
        }),
        prisma.contact.count({ where })
    ]);

    return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

export async function fetchContactByPhone(phone: string): Promise<Contact | null> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    
    const contact = await prisma.contact.findFirst({
        where: { phone }
    });
    return contact;
}

export async function fetchContactStatuses(): Promise<ContactStatus[]> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const data = await prisma.contactStatus.findMany({
        orderBy: { order: "asc" }
    });
    return data;
}

export async function fetchContactCount(profileId?: string, isAdmin?: boolean): Promise<number> {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    const where: any = {};
    if (!isAdmin && profileId) {
        where.ownerId = profileId;
    }
    return await prisma.contact.count({ where });
}

export async function updateContact(id: string, updates: Partial<Contact>) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    // Remove any undefined or non-database fields if needed
    return await prisma.contact.update({
        where: { id },
        data: updates as any
    });
}

export async function deleteContact(id: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.contact.delete({
        where: { id }
    });
}

export async function bulkDeleteContacts(ids: string[]) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.contact.deleteMany({
        where: { id: { in: ids } }
    });
}

export async function bulkCreateContacts(contacts: Omit<Contact, "id" | "createdAt" | "updatedAt">[]) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    // prisma.createMany is preferred
    await prisma.contact.createMany({
        data: contacts as any[]
    });
    
    // return inserted data if needed, Prisma createMany doesn't return the rows, just count.
    return contacts;
}

export async function createContactStatus(status: Omit<ContactStatus, "id" | "createdAt">) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    return await prisma.contactStatus.create({
        data: status as any
    });
}

export async function deleteContactStatus(id: string) {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");

    await prisma.contactStatus.delete({
        where: { id }
    });
}
