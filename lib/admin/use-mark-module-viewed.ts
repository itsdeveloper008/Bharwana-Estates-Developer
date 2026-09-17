"use client";

import { useEffect } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import {
  markAdminModuleViewed,
  type AdminBadgeModule,
} from "@/lib/admin/unseen-badges";

/** Clears the sidebar unseen badge when an admin actually opens a module page. */
export function useMarkAdminModuleViewed(badgeModule: AdminBadgeModule) {
  const { admin } = useAdminAuth();
  useEffect(() => {
    if (!admin?.uid) return;
    markAdminModuleViewed(admin.uid, badgeModule);
  }, [admin?.uid, badgeModule]);
}
