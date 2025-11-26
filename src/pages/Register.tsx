import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { registerStep1Schema, registerStep2Schema } from "@/lib/validations";
import { toast } from "sonner";
import brasaoSP from "@/assets/brasao-sp.png";

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "" };
    if (password.length < 6) return { strength: 33, label: "Fraca", color: "bg-red-500" };
    if (password.length < 10) return { strength: 66, label: "Média", color: "bg-yellow-500" };
    return { strength: 100, label: "Forte", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      registerStep1Schema.parse({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      });
      setCurrentStep(2);
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          toast.error(err.message);
        });
      }
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      registerStep2Schema.parse({
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      setLoading(true);

      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Logo Header */}
      <div className="flex items-center justify-center gap-3 pt-12 pb-8 px-6">
        <img src={brasaoSP} alt="Brasão São Paulo" className="w-16 h-16" />
        <div className="text-left">
          <p className="text-xs text-gray-600">CÂMARA MUNICIPAL DE</p>
          <p className="text-lg font-bold text-gray-900">SÃO PAULO</p>
        </div>
      </div>

      {/* Header Text */}
      <div className="px-6 pb-6">
        {currentStep === 1 ? (
          <>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              Olá!<br />
              queremos<br />
              te conhecer!
            </h1>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="mb-4 -ml-2"
            >
              <ArrowLeft size={20} className="mr-2" />
              Voltar
            </Button>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              Quase lá!<br />
              Crie sua senha
            </h1>
          </>
        )}
      </div>

      {/* Form Card */}
      <div className="flex-1 bg-white rounded-t-[32px] px-6 pt-8">
        {currentStep === 1 ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Vamos começar</h2>
            
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Nome completo
                </label>
                <Input
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="h-14 bg-gray-50 border-gray-200"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="h-14 bg-gray-50 border-gray-200"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Celular
                </label>
                <Input
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="h-14 bg-gray-50 border-gray-200"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-gray-900 text-white hover:bg-gray-800 rounded-full text-base font-medium mt-6"
              >
                Continuar
              </Button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Segurança</h2>
            
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="h-14 bg-gray-50 border-gray-200 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Força da senha:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.strength === 33 ? "text-red-500" :
                        passwordStrength.strength === 66 ? "text-yellow-500" :
                        "text-green-500"
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.strength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite sua senha novamente"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className="h-14 bg-gray-50 border-gray-200 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gray-900 text-white hover:bg-gray-800 rounded-full text-base font-medium mt-6"
              >
                {loading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
          </>
        )}

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600 mt-8 mb-6">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-gray-900 font-semibold">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
