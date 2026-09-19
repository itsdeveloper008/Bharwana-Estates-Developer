"use client";

import { useEffect } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import {
  markAdminModuleViewed,
  type AdminBadgeModule,
} from "@/lib/admin/unseen-badges";

/** Marks last-viewed for unseen-style badges (inquiries, users, newsletter).
 * Queue badges (submissions, dealers, deletion) ignore this timestamp and clear when status changes. */
export function useMarkAdminModuleViewed(badgeModule: AdminBadgeModule) {
  const { admin } = useAdminAuth();
  useEffect(() => {
    if (!admin?.uid) return;
    markAdminModuleViewed(admin.uid, badgeModule);
  }, [admin?.uid, badgeModule]);
}
