import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

type AdminClient = ReturnType<typeof createClient>;

async function removePaths(admin: AdminClient, bucket: string, paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter((path): path is string => !!path))];
  for (let index = 0; index < unique.length; index += 100) {
    const { error } = await admin.storage.from(bucket).remove(unique.slice(index, index + 100));
    if (error) throw new Error(`storage_cleanup_failed:${bucket}`);
  }
}

async function collectAndRemoveBabyFiles(admin: AdminClient, babyIds: string[]) {
  if (!babyIds.length) return;
  const [{ data: babies, error: babyError }, { data: meals, error: mealError }] = await Promise.all([
    admin.from("babies").select("avatar_path").in("id", babyIds),
    admin.from("meals").select("photo_path").in("baby_id", babyIds).not("photo_path", "is", null),
  ]);
  if (babyError || mealError) throw new Error("file_manifest_failed");
  await Promise.all([
    removePaths(admin, "baby-avatars", (babies || []).map((row) => row.avatar_path)),
    removePaths(admin, "meal-photos", (meals || []).map((row) => row.photo_path)),
  ]);
}

async function refreshPathsAsService(admin: AdminClient, bucket: string, paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter((path): path is string => !!path))];
  for (const path of unique) {
    const { data: file, error: downloadError } = await admin.storage.from(bucket).download(path);
    if (downloadError || !file) throw new Error(`storage_download_failed:${bucket}`);
    const { error: removeError } = await admin.storage.from(bucket).remove([path]);
    if (removeError) throw new Error(`storage_release_failed:${bucket}`);
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (uploadError) throw new Error(`storage_reupload_failed:${bucket}`);
  }
}

async function refreshRetainedFamilyFiles(admin: AdminClient, familyIds: string[]) {
  if (!familyIds.length) return;
  const { data: babies, error: babyError } = await admin.from("babies").select("id,avatar_path").in("family_id", familyIds);
  if (babyError) throw new Error("retained_file_manifest_failed");
  const babyIds = (babies || []).map((baby) => baby.id);
  const { data: meals, error: mealError } = babyIds.length
    ? await admin.from("meals").select("photo_path").in("baby_id", babyIds).not("photo_path", "is", null)
    : { data: [], error: null };
  if (mealError) throw new Error("retained_file_manifest_failed");
  await Promise.all([
    refreshPathsAsService(admin, "baby-avatars", (babies || []).map((baby) => baby.avatar_path)),
    refreshPathsAsService(admin, "meal-photos", (meals || []).map((meal) => meal.photo_path)),
  ]);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "authentication_required" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const publishable = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const authClient = createClient(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) return json({ error: "authentication_required" }, 401);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "delete_baby") {
      const babyId = String(body.baby_id || "");
      const { data: baby } = await admin.from("babies").select("id,family_id,nickname").eq("id", babyId).maybeSingle();
      if (!baby) return json({ error: "baby_not_found" }, 404);
      const { data: membership } = await admin.from("family_members").select("role").eq("family_id", baby.family_id).eq("user_id", user.id).maybeSingle();
      if (membership?.role !== "owner") return json({ error: "owner_required" }, 403);
      await collectAndRemoveBabyFiles(admin, [baby.id]);
      const { error } = await admin.from("babies").delete().eq("id", baby.id).eq("family_id", baby.family_id);
      if (error) throw new Error("baby_delete_failed");
      return json({ ok: true, deleted_baby: baby.nickname });
    }

    if (action === "delete_family") {
      const familyId = String(body.family_id || "");
      const { data: family } = await admin.from("families").select("id,name").eq("id", familyId).maybeSingle();
      if (!family) return json({ error: "family_not_found" }, 404);
      // 所有权以 family_members.role 为准；families.owner_id 是展示字段，不作为授权依据
      const { data: ownerMembership } = await admin.from("family_members").select("role")
        .eq("family_id", familyId).eq("user_id", user.id).maybeSingle();
      if (ownerMembership?.role !== "owner") return json({ error: "owner_required" }, 403);
      const { data: babies } = await admin.from("babies").select("id").eq("family_id", familyId);
      await collectAndRemoveBabyFiles(admin, (babies || []).map((baby) => baby.id));
      const { error } = await admin.from("families").delete().eq("id", familyId);
      if (error) throw new Error("family_delete_failed");
      return json({ ok: true, deleted_family: family.name });
    }

    if (action === "delete_account") {
      const { data: memberships, error: membershipError } = await admin
        .from("family_members")
        .select("family_id,role,families(id,name,owner_id)")
        .eq("user_id", user.id);
      if (membershipError) throw new Error("membership_lookup_failed");

      const owned = (memberships || []).filter((membership) => membership.role === "owner");
      for (const membership of owned) {
        const { count } = await admin.from("family_members").select("id", { count: "exact", head: true }).eq("family_id", membership.family_id);
        if ((count || 0) > 1) return json({ error: "transfer_required", family_id: membership.family_id }, 409);
      }
      if (owned.length && body.delete_solo_families !== true) {
        return json({ error: "solo_family_confirmation_required", family_ids: owned.map((item) => item.family_id) }, 409);
      }

      for (const membership of owned) {
        const { data: babies } = await admin.from("babies").select("id").eq("family_id", membership.family_id);
        await collectAndRemoveBabyFiles(admin, (babies || []).map((baby) => baby.id));
        const { error } = await admin.from("families").delete().eq("id", membership.family_id);
        if (error) throw new Error("owned_family_delete_failed");
      }

      const ownedFamilyIds = new Set(owned.map((membership) => membership.family_id));
      const retainedFamilyIds = (memberships || [])
        .map((membership) => membership.family_id)
        .filter((familyId) => !ownedFamilyIds.has(familyId));

      let { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteUserError && retainedFamilyIds.length) {
        // Storage objects uploaded by this user can prevent Auth deletion. Recreate retained
        // family files with the service client so shared family data remains available.
        await refreshRetainedFamilyFiles(admin, retainedFamilyIds);
        ({ error: deleteUserError } = await admin.auth.admin.deleteUser(user.id));
      }
      if (deleteUserError) throw new Error("auth_user_delete_failed");
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: "server_operation_failed" }, 500);
  }
});
