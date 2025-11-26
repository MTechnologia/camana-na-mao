import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { registerSchema, RegisterInput } from "@/lib/validations";
import { toast } from "sonner";

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RegisterInput>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field: keyof RegisterInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = registerSchema.parse(formData);
      setLoading(true);

      const { error } = await signUp(
        validated.email,
        validated.password,
        validated.fullName,
        validated.phone
      );

      if (!error) {
        navigate("/onboarding");
      }
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          toast.error(err.message);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Logo */}
      <div className="flex justify-center pt-16 pb-8">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mb-2">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">CÂMARA MUNICIPAL DE</p>
            <p className="text-sm font-bold text-foreground">SÃO PAULO</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">Criar Conta</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Nome Completo</label>
            <Input
              type="text"
              placeholder="Seu nome completo"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              className="h-12"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">E-mail</label>
            <Input
              type="email"
              placeholder="nome@email.com.br"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="h-12"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Celular</label>
            <Input
              type="tel"
              placeholder="(11) 98765-4321"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="h-12"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="h-12 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Confirmar Senha</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className="h-12"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-full"
          >
            {loading ? "Criando conta..." : "Criar Conta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mb-4">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-foreground font-medium">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
