"use client";

import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
  azure: "Continue with Microsoft",
  apple: "Continue with Apple",
};

function getOAuthProviders(): Provider[] {
  const raw = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "google";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as Provider[];
}

export function OAuthSignIn({
  portal = "staff",
  className,
}: {
  portal?: "staff" | "director";
  className?: string;
}) {
  const providers = getOAuthProviders();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  if (!providers.length) return null;

  async function handleOAuth(provider: Provider) {
    setLoadingProvider(provider);
    const supabase = createClient();
    const params = new URLSearchParams({ portal });
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?${params.toString()}`,
      },
    });
    if (error) {
      setLoadingProvider(null);
      console.error("OAuth sign-in failed:", error.message);
    }
  }

  return (
    <div className={className}>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <div className="space-y-2">
        {providers.map((provider) => (
          <Button
            key={provider}
            type="button"
            variant="outline"
            className="w-full"
            disabled={loadingProvider !== null}
            onClick={() => handleOAuth(provider)}
          >
            {loadingProvider === provider && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {PROVIDER_LABELS[provider] ?? `Continue with ${provider}`}
          </Button>
        ))}
      </div>
    </div>
  );
}
