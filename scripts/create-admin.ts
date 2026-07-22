import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = '360crm.com@protonmail.com';
    const password = 'Production77#';
    
    // Hash password
    const hashedPassword = await hash(password, 10);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log("User already exists!");
        
        // Ensure they have an account and profile
        const profile = await prisma.profile.findUnique({
            where: { userId: existingUser.id }
        });
        
        if (!profile) {
            console.log("Creating profile for existing user...");
            // Need an organization. Let's create a default one or get existing.
            let org = await prisma.organization.findFirst();
            if (!org) {
                org = await prisma.organization.create({
                    data: { name: "Default Organization", slug: "default" }
                });
            }
            
            await prisma.profile.create({
                data: {
                    userId: existingUser.id,
                    organizationId: org.id,
                    fullName: "Super Admin",
                    email: email,
                    role: "admin",
                }
            });
            console.log("Profile created.");
        }
        
        // update password
        const account = await prisma.account.findFirst({
            where: { userId: existingUser.id }
        });
        if (account) {
            await prisma.account.update({
                where: { id: account.id },
                data: { password: hashedPassword }
            });
            console.log("Password updated.");
        }
        
        return;
    }

    console.log("Creating new Super Admin...");
    let org = await prisma.organization.findFirst();
    if (!org) {
        org = await prisma.organization.create({
            data: { name: "Default Organization", slug: "default" }
        });
    }

    const newUser = await prisma.user.create({
        data: {
            email: email,
            name: "Super Admin",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            accounts: {
                create: {
                    accountId: email,
                    providerId: 'credential',
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            },
            profile: {
                create: {
                    organizationId: org.id,
                    fullName: "Super Admin",
                    email: email,
                    role: "admin",
                }
            }
        },
        include: {
            profile: true
        }
    });

    console.log("Super Admin created successfully:", newUser.email);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
