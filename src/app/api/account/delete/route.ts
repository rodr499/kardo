import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create admin client for deleting auth user
    let adminClient;
    try {
      adminClient = createSupabaseAdminClient();
    } catch (adminError: any) {
      console.error("Failed to create admin client:", adminError.message);
      // Continue with profile deletion even if admin client fails
    }

    // Release all cards claimed by this user (unclaim them)
    const { error: cardsError } = await supabase
      .from("cards")
      .update({
        profile_id: null,
        claimed_at: null,
        status: "unclaimed",
      })
      .eq("profile_id", user.id);

    if (cardsError) {
      console.error("Error releasing cards:", cardsError);
      // Continue with deletion even if card release fails
    }

    // Get profile to find avatar URL before deleting
    const { data: profileData } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    // Delete avatar from storage if it exists
    if (profileData?.avatar_url) {
      const urlParts = profileData.avatar_url.split("/");
      const avatarFileName = urlParts[urlParts.length - 1];
      if (avatarFileName) {
        await supabase.storage
          .from("avatars")
          .remove([avatarFileName]);
      }
    }

    // Also try to delete any avatars with user ID pattern (cleanup)
    try {
      const avatarFiles = await supabase.storage
        .from("avatars")
        .list();

      if (avatarFiles.data) {
        const userAvatars = avatarFiles.data.filter(
          (file) => file.name.startsWith(user.id)
        );
        if (userAvatars.length > 0) {
          await supabase.storage
            .from("avatars")
            .remove(userAvatars.map((f) => f.name));
        }
      }
    } catch (storageError) {
      // Continue even if avatar deletion fails
      console.error("Error deleting avatars:", storageError);
    }

    // Delete the profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      return NextResponse.json(
        { error: "Failed to delete profile: " + profileError.message },
        { status: 500 }
      );
    }

    // Delete the auth user using admin client (requires service role key)
    if (adminClient) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
        user.id
      );

      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError);
        // Still sign out even if deletion fails
        await supabase.auth.signOut();
        return NextResponse.json(
          {
            error:
              "Account data deleted, but auth user deletion failed. Please contact support if you see this error.",
          },
          { status: 500 }
        );
      }
    } else {
      // If admin client is not available, sign out and warn
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY not set. Auth user not deleted. Profile and cards have been released."
      );
      await supabase.auth.signOut();
      return NextResponse.json({
        success: true,
        warning:
          "Account data deleted, but auth user may still exist. Set SUPABASE_SERVICE_ROLE_KEY environment variable for complete deletion.",
      });
    }

    // Sign out the user session
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
