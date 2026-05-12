import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

/**
 * HU-11.1 — Página de complemento de cadastro após convite por email.
 *
 * Fluxo:
 *   1. Usuário recebe email de convite, clica no link.
 *   2. Supabase cria sessão (autenticado) e redireciona para esta rota.
 *   3. Mostra form de:
 *      - Senha + confirmação (obrigatórias — convite cria user sem senha)
 *      - Nome completo (preenche se veio no metadata.full_name)
 *      - Telefone (opcional)
 *   4. Após salvar, segue para /onboarding (interesses).
 *
 * O resto do perfil (endereço, demográficos) é coletado nas próprias telas
 * do perfil, acessíveis depois.
 */

export default function CompleteInvitePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pré-preenche nome do metadata se veio no convite.
  useEffect(() => {
    if (user?.user_metadata?.full_name && !fullName) {
      setFullName(user.user_metadata.full_name as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Se não está autenticado depois do load, é porque o link expirou ou
  // o usuário veio direto à rota. Redireciona pro login.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const passwordsMatch =
    password.length > 0 && password === confirmPassword;
  const passwordValid = password.length >= 8;
  const fullNameValid = fullName.trim().length >= 3;
  const formValid = passwordValid && passwordsMatch && fullNameValid;

  const handleSubmit = async () => {
    if (!formValid) return;
    setSubmitting(true);
    try {
      // Atualiza senha
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      // Salva nome e telefone em profiles (insert criado pelo trigger; aqui só atualiza)
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", user.id);
      if (profErr) throw profErr;

      toast.success("Cadastro completado. Vamos personalizar sua experiência.");
      navigate("/onboarding", { replace: true });
    } catch (err) {
      console.error("[CompleteInvitePage]", err);
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      toast.error(`Não foi possível salvar: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Bem-vindo(a) à Câmara na Mão!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Para concluir o acesso, defina sua senha e confirme alguns dados.
          </p>
        </div>

        <div className="space-y-4">
          {/* Senha */}
          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative mt-1">
              <KeyRound className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-8 pr-9"
                disabled={submitting}
                autoFocus
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {password && !passwordValid && (
              <p className="text-[11px] text-destructive mt-1">
                A senha precisa ter pelo menos 8 caracteres.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1"
              disabled={submitting}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-[11px] text-destructive mt-1">
                As senhas não conferem.
              </p>
            )}
          </div>

          {/* Nome */}
          <div>
            <Label htmlFor="full-name">Nome completo</Label>
            <div className="relative mt-1">
              <User className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="full-name"
                placeholder="Como você quer ser chamado(a)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-8"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Telefone */}
          <div>
            <Label htmlFor="phone">Celular (opcional)</Label>
            <div className="relative mt-1">
              <Phone className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 90000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-8"
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={() => void handleSubmit()}
          disabled={!formValid || submitting}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Continuar
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          Depois de continuar, você poderá complementar endereço e dados
          demográficos no menu Perfil.
        </p>
      </Card>
    </div>
  );
}
