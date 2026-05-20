import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function updateAdminEmail() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Supabase credentials in .env.local");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const oldEmail = 'admin@nanosol.com';
    const newEmail = 'admin@360crm.com';

    console.log(`Looking up user with email: ${oldEmail}...`);

    // Get the user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error("Error listing users:", listError);
        process.exit(1);
    }

    const user = users.find(u => u.email === oldEmail);
    if (!user) {
        console.error(`User with email ${oldEmail} not found!`);
        process.exit(1);
    }

    console.log(`Found user ID: ${user.id}. Updating email to ${newEmail}...`);

    // Update Auth user
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email: newEmail, email_confirm: true }
    );

    if (updateError) {
        console.error("Error updating user email in Auth:", updateError);
        process.exit(1);
    }

    console.log(`✅ Auth user email updated to: ${updateData.user.email}`);

    // Update profiles table
    console.log(`Updating profiles table...`);
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('user_id', user.id)
        .select();

    if (profileError) {
        console.error("Error updating profiles table:", profileError);
        process.exit(1);
    }

    console.log("✅ Profile updated:", profileData);
    console.log("All done!");
}

updateAdminEmail();
