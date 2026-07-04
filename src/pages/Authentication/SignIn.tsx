import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// ✅ IMPORT THE HELPER FUNCTION
import { supabase, setPersistencePreference } from "@/lib/supabaseClient";
import { toast } from "sonner";

import logo from "@/assets/images/PawPal.svg";
import heroBg from "@/assets/images/hero_3.jpg";

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

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);

  const LOCKOUT_AFTER = 5;   // attempts
  const LOCKOUT_SECS  = 30;  // seconds

  // Live countdown timer
  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownUntil(null);
        setCooldownSecs(0);
        setFailedAttempts(0);
      } else {
        setCooldownSecs(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false, // Default unchecked
    },
  });

  const onSubmit = async (data: SignInFormValues) => {
    // Client-side rate limiting
    if (cooldownUntil && Date.now() < cooldownUntil) return;

    try {
      setPersistencePreference(!!data.rememberMe);

      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (signInError) {
        // Increment attempt counter and possibly trigger lockout
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= LOCKOUT_AFTER) {
          setCooldownUntil(Date.now() + LOCKOUT_SECS * 1000);
        }
        // Normalize — never expose raw Supabase error text
        toast.error("Invalid email or password.");
        return;
      }

      // Successful login — reset counters
      setFailedAttempts(0);
      setCooldownUntil(null);

      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("banned_at, deleted_at")
          .eq("id", authData.user.id)
          .maybeSingle();

        await supabase
          .from("profiles")
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq("id", authData.user.id);

        if (!profile?.banned_at && !profile?.deleted_at) {
          toast.success("Welcome back! 🐾");
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@cvsu.edu.ph"
                {...register("email")}
                className={`h-12 rounded-xl bg-white border ${
                  errors.email
                    ? "border-red-300 focus-visible:ring-red-200"
                    : "border-gray-200 focus-visible:ring-blue-600"
                }`}
              />
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

            {/* Rate-limit warning */}
            {failedAttempts > 0 && !cooldownUntil && (
              <p className="text-[11px] text-amber-600 text-center">
                {LOCKOUT_AFTER - failedAttempts} attempt{LOCKOUT_AFTER - failedAttempts !== 1 ? "s" : ""} remaining before temporary lockout.
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !!cooldownUntil}
              className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-md mt-2 shadow-sm transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : cooldownUntil ? (
                `Too many attempts — try again in ${cooldownSecs}s`
              ) : (
                "Sign In"
              )}
            </Button>

          </form>
        </div>
      </div>
    </div>
  );
}
