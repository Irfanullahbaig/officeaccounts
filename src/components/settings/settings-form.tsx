"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateSetting } from "@/lib/actions/finance";
import { toast } from "sonner";

interface Setting {
  id: string;
  key: string;
  value: string;
}

export function SettingsForm({ settings }: { settings: Setting[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const companyName = JSON.parse(settings.find((s) => s.key === "company_name")?.value ?? '"N9Accounts"');
  const sessionTimeout = JSON.parse(settings.find((s) => s.key === "session_timeout_minutes")?.value ?? "480");
  const twoFactorRequired = JSON.parse(settings.find((s) => s.key === "two_factor_required")?.value ?? "false");

  async function saveSetting(key: string, value: unknown) {
    setLoading(true);
    try {
      await updateSetting(key, value);
      toast.success("Settings saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Company Name</Label>
        <div className="flex gap-2">
          <Input defaultValue={String(companyName)} id="company_name" />
          <Button
            disabled={loading}
            onClick={() => {
              const el = document.getElementById("company_name") as HTMLInputElement;
              saveSetting("company_name", el.value);
            }}
          >
            Save
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Session Timeout (minutes)</Label>
        <div className="flex gap-2">
          <Input type="number" defaultValue={sessionTimeout} id="session_timeout" />
          <Button
            disabled={loading}
            onClick={() => {
              const el = document.getElementById("session_timeout") as HTMLInputElement;
              saveSetting("session_timeout_minutes", Number(el.value));
            }}
          >
            Save
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Two-Factor Authentication</Label>
          <p className="text-sm text-muted-foreground">Require 2FA for all users (architecture ready)</p>
        </div>
        <Switch
          checked={twoFactorRequired}
          onCheckedChange={(checked) => saveSetting("two_factor_required", checked)}
        />
      </div>
    </div>
  );
}
