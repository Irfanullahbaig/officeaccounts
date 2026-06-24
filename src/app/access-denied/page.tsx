import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCESS_DENIED_MESSAGE } from "@/lib/auth/permissions";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldX className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription className="text-base mt-2">
            {ACCESS_DENIED_MESSAGE}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            If you believe this is an error, please contact your system administrator.
          </p>
          <Button render={<Link href="/login" />}>Return to Login</Button>
        </CardContent>
      </Card>
    </div>
  );
}
