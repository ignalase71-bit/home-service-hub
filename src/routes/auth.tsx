import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso profesional | Instalia Jerez" },
      {
        name: "description",
        content:
          "Acceso al panel interno de gestión de visitas, instaladores y agenda de Instalia Jerez.",
      },
      { property: "og:title", content: "Acceso profesional | Instalia Jerez" },
      {
        property: "og:description",
        content: "Panel interno de gestión de visitas e instaladores.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu correo si se requiere confirmación.");
        setMode("login");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar el acceso");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-16">
      <Card className="w-full max-w-md panel">
        <CardHeader>
          <p className="text-eyebrow">Área interna</p>
          <CardTitle className="text-2xl">Panel de gestión</CardTitle>
          <CardDescription>
            Acceso restringido al equipo. Los clientes no ven la agenda interna.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
          </button>
          <p className="text-xs text-muted-foreground">
            <Link to="/" className="underline">
              Volver a la web pública
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
