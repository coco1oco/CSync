import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";

import logo from "@/assets/images/Pawpal.svg";
import heroBg from "@/assets/images/hero_3.jpg";

// 1. Define the Zod Schema
// This replaces your manual regex and if/else checks
const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().default(false).optional(),
});

// Infer the TypeScript type from the schema automatically
type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignIn() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // 2. Initialize React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // 3. The Submit Handler
  // This only runs if Zod validation passes
  const onSubmit = async (data: SignInFormValues) => {
    setServerError(null);

    try {
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (signInError) {
        throw signInError; // Throws to catch block
      }

      if (authData.user) {
        // Optional: Update last sign in
        await supabase
          .from("profiles")
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq("id", authData.user.id);
      }

      // Navigation is handled by the useEffect above or AuthContext
    } catch (err: any) {
      console.error("Login error:", err);
      setServerError(err.message || "Invalid login credentials.");
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-white overflow-hidden">
      {/* LEFT SIDE: Hero Image */}
      <div className="hidden lg:flex w-1/2 bg-blue-50 relative overflow-hidden">
        <img
          src={heroBg}
          alt="Login Dog"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent" />
        <div className="absolute bottom-12 left-12 text-white p-8 max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Welcome back.</h1>
          <p className="text-lg opacity-90">
            Your pet&apos;s health records are just a click away.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-hidden">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center lg:text-left">
            <img
              src={logo}
              alt="PawPal"
              className="h-16 w-auto mx-auto lg:mx-0 mb-4"
            />
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Sign in
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              New to PawPal?{" "}
              <Link
                to="/SignUp"
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* Server Error Message */}
          {serverError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl animate-in fade-in">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                // 4. Connect input to react-hook-form
                {...register("email")}
                className={`h-12 rounded-xl bg-white border ${
                  errors.email
                    ? "border-red-300 focus-visible:ring-red-200"
                    : "border-gray-200 focus-visible:ring-blue-600"
                }`}
              />
              {/* Show Zod Error Message */}
              {errors.email && (
                <p className="text-[10px] text-red-500 ml-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="sr-only">
                  Password
                </Label>
                <Link
                  to="/ForgotPassword"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                  className={`h-12 rounded-xl bg-white pr-10 border ${
                    errors.password
                      ? "border-red-300 focus-visible:ring-red-200"
                      : "border-gray-200 focus-visible:ring-blue-600"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 no-eye"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-500 ml-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-md mt-2 shadow-sm transition-all active:scale-[0.98]"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
