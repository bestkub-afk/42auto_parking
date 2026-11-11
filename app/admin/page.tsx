"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalData } from "@/utils/context";
import { firstAllowedPath } from "@/data/permissions";
import { getCurrentUser } from "@/utils/login";

// เปิด /admin เฉย ๆ → ไปเมนูแรกที่มีสิทธิ์
export default function Page() {
  const router = useRouter();
  const { data } = useGlobalData();

  useEffect(() => {
    const user = getCurrentUser(data);
    if (user) router.replace(firstAllowedPath(user.role, data.adminPermissions));
  }, [data, router]);

  return null;
}
