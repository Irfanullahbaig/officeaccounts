"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, Loader2 } from "lucide-react";
import { DIRECTOR_ACCESS_DENIED_MESSAGE } from "@/lib/auth/permissions";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function DirectorLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DirectorLoginContent />
    </Suspense>
  );
}

function DirectorLoginContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          portal: "director",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error === DIRECTOR_ACCESS_DENIED_MESSAGE
            ? DIRECTOR_ACCESS_DENIED_MESSAGE
            : result.error ?? "Login failed."
        );
        setLoading(false);
        return;
      }

      router.push("/director/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-violet-700 text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Eye className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">Director Portal</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Company Financial<br />Oversight
          </h1>
          <p className="text-violet-100 text-lg max-w-md">
            Monitor revenue, loans, savings, commissions, and employee performance in real time.
            View-only access — no data can be modified from this portal.
          </p>
        </div>
        <p className="text-sm text-violet-200">
          Authorized directors only. All sessions are logged.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Director Sign In</CardTitle>
            <CardDescription>
              Use your director email to access the read-only dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Director Email</Label>
                <Input id="email" type="email" placeholder="director@company.com" {...form.register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" {...form.register("password")} />
              </div>
              <Button type="submit" className="w-full bg-violet-700 hover:bg-violet-800" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Access Portal
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-6">
              Staff or admin?{" "}
              <Link href="/login" className="underline hover:text-foreground">
                Sign in to the management system
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
