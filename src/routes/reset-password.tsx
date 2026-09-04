import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nueva contraseña | Instalia Jerez" },
      {
        name: "description",
        content: "Define una contraseña nueva para acceder al panel de gestión de Instalia Jerez.",
      },
      { property: "og:title", content: "Nueva contraseña | Instalia Jerez" },
      {
        property: "og:description",
        content: "Restablece el acceso al panel interno de gestión.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada");
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la contraseña");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
      <Card className="w-full max-w-md panel">
        <CardHeader>
          <p className="text-eyebrow">Área interna</p>
          <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
          <CardDescription>
            {ready
              ? "Escribe una contraseña nueva de al menos 8 caracteres, poco habitual."
              : "Abre este enlace desde el correo de recuperación para continuar."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!ready}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !ready}>
              Guardar contraseña
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            <Link to="/auth" className="underline">
              Volver al acceso
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
