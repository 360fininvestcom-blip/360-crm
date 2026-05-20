import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function createAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Supabase credentials in .env.local");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const email = 'admin@nanosol.com';
    const password = 'AdminPassword123!';

    console.log(`Creating user with email: ${email}...`);

    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
            full_name: 'Admin User'
        }
    });

    if (error) {
        console.error("Error creating user:", error);
        process.exit(1);
    }

    console.log("✅ User created successfully:", data.user.id);
}

createAdmin();
