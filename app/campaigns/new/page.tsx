"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";
import { CampaignForm } from "@/components/campaign/campaign-form";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@supabase/supabase-js";

export default function NewCampaignPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setUserId(user.id);
      } else {
        router.push("/auth/login");
      }
    }
    getUser();
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-1 container py-8 px-4 md:px-6 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold">Create New Campaign</h1>
          <p className="text-muted-foreground mt-1">Start a new D&D adventure</p>
        </div>

        {userId && (
          <CampaignForm
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                router.push("/campaigns");
              }
            }}
            userId={userId}
          />
        )}
      </main>
    </div>
  );
}

