"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Loader2 } from "lucide-react";
import { ACCESS_DENIED_MESSAGE } from "@/lib/auth/permissions";

const loginSchema = z.object({
  email: z.string().email("Enter a valid company email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError === "Configuration") {
      setError(
        "Server configuration error. Ensure AUTH_SECRET, DATABASE_URL, and NEXTAUTH_URL are set on Vercel."
      );
    } else if (authError === "CredentialsSignin") {
      setError(ACCESS_DENIED_MESSAGE);
    }
  }, [searchParams]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email: data.email.toLowerCase(),
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError(
        result.error === "Configuration"
          ? "Server configuration error. Ensure AUTH_SECRET, DATABASE_URL, and NEXTAUTH_URL are set on Vercel."
          : result.error === "CredentialsSignin"
            ? "Invalid email or password. Use admin@northnine.pk with your admin password."
            : "Sign in failed. Please try again."
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center font-bold text-lg">
              N9
            </div>
            <span className="text-xl font-semibold">N9Accounts</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Internal Finance<br />Management System
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-md">
            Secure, private platform for payroll, loans, savings, commissions, and financial reporting.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-foreground/60">
          <ShieldAlert className="h-4 w-4" />
          Authorized personnel only. All access is monitored and logged.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="text-center">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                N9
              </div>
            </div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>
              Use your authorized company email to access the system
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
                <Label htmlFor="email">Company Email</Label>
                <Input id="email" type="email" placeholder="admin@northnine.pk" {...form.register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" {...form.register("password")} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-6">
              No public registration. Contact your Super Admin for access.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
