import { createClient } from "@/lib/supabase/client";

/**
 * Simple utility to get user email.
 * Note: Supabase auth doesn't allow querying other users' emails directly.
 * This is a placeholder for future implementation with a profiles table.
 * For now, returns null and components should handle displaying user_id or "Unassigned"
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Only return email if it's the current user
    if (user && user.id === userId) {
      return user.email || null;
    }
    
    // For other users, we can't fetch their email directly
    // In the future, this should query a profiles table
    return null;
  } catch (error) {
    console.error("Error fetching user email:", error);
    return null;
  }
}

