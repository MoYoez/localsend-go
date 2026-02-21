"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Share UI lives at the bottom of the manage page; redirect to /manage#share. */
export default function SharePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/manage#share");
  }, [router]);
  return null;
}
