import { PrismaClient } from '@prisma/client';
import { auth } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
    const email = '360crm.com@protonmail.com';
    const password = 'Production77#';
    
    console.log("Deleting old user with bcrypt hash...");
    await prisma.user.deleteMany({
        where: { email }
    });

    console.log("Creating new user via better-auth native API...");
    
    // We construct a mock request to pass into better-auth
    const headers = new Headers();
    // better-auth might require some headers like user-agent or origin, but usually it's fine.
    
    try {
        const result = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: "Super Admin"
            }
        });
        
        console.log("User created via Better Auth!", result);

        // Update profile and ensure organization
        const newUser = await prisma.user.findUnique({ where: { email } });
        if (newUser) {
            let org = await prisma.organization.findFirst();
            if (!org) {
                org = await prisma.organization.create({
                    data: { name: "Default Organization", slug: "default" }
                });
            }
            
            await prisma.profile.create({
                data: {
                    userId: newUser.id,
                    organizationId: org.id,
                    fullName: "Super Admin",
                    email: email,
                    role: "admin",
                }
            });
            console.log("Profile and admin role granted successfully.");
        }
    } catch (e) {
        console.error("Error creating user:", e);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
