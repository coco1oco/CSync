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
import heroBg from "@/assets/images/hero_2.jpg";

// 1. Define Regex Patterns
// ✅ CHANGED: Now enforces @cvsu.edu.ph domain
const CVSU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@cvsu\.edu\.ph$/;
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,15}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

// 2. Define Zod Schema
const signUpSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format")
      // ✅ UPDATED VALIDATION RULE
      .regex(
        CVSU_EMAIL_REGEX,
        "Please use your institutional email (@cvsu.edu.ph)"
      ),
    username: z
      .string()
      .min(1, "Username is required")
      .regex(
        USERNAME_REGEX,
        "3–16 chars, letters, numbers, and _ only. Must start with a letter."
      ),
    password: z
      .string()
      .min(1, "Password is required")
      .regex(
        PASSWORD_REGEX,
        "Min 8 chars: Upper, lower, number, and special symbol."
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Error will show on this field
  });

// Type Inference
type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // 3. Initialize React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur", // Validate on blur for better UX
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Redirect Logic
  useEffect(() => {
    if (user && !loading) {
      if (!user.first_name || !user.last_name) {
        navigate("/ProfilePage/Edit", { replace: true });
      } else {
        navigate("/ProfilePage", { replace: true });
      }
    }
  }, [user, loading, navigate]);

  // 4. Submit Handler
  const onSubmit = async (data: SignUpFormValues) => {
    setServerError(null);

    try {
      // Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      const createdUser = authData.user;

      if (createdUser) {
        // Create Profile Entry
        const { error: profileError } = await supabase.from("profiles").upsert([
          {
            id: createdUser.id,
            email: data.email,
            username: data.username,
          },
        ]);

        if (profileError) throw profileError;
      }

      // Success handled by AuthContext + useEffect redirect
    } catch (err: any) {
      console.error("SignUp Error:", err);
      setServerError(err.message || "An error occurred during sign up");
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-white overflow-hidden">
      {/* LEFT SIDE: Hero Image */}
      <div className="hidden lg:flex w-1/2 bg-blue-50 relative overflow-hidden">
        <img
          src={heroBg}
          alt="Signup Dog"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent" />
        <div className="absolute bottom-12 left-12 text-white p-8 max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Join the pack.</h1>
          <p className="text-lg opacity-90">
            Create a profile for your pets and start tracking their health
            today.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 overflow-hidden">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center lg:text-left">
            <img
              src={logo}
              alt="PawPal"
              className="h-16 w-auto mx-auto lg:mx-0 mb-4"
            />
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Create account
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Already a member?{" "}
              <Link
                to="/SignIn"
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Server Error */}
          {serverError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl animate-in fade-in">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@cvsu.edu.ph"
                {...register("email")}
                className={`h-11 rounded-xl bg-white focus-visible:ring-blue-600 border ${
                  errors.email
                    ? "border-red-300 focus-visible:ring-red-200"
                    : "border-gray-200"
                }`}
              />
              {errors.email && (
                <p className="text-[10px] text-red-500 ml-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Username"
                {...register("username")}
                className={`h-11 rounded-xl bg-white focus-visible:ring-blue-600 border ${
                  errors.username
                    ? "border-red-300 focus-visible:ring-red-200"
                    : "border-gray-200"
                }`}
              />
              {errors.username ? (
                <p className="text-[10px] text-red-500 ml-1">
                  {errors.username.message}
                </p>
              ) : (
                <p className="text-[10px] text-gray-400 ml-1">
                  3–16 chars, letters, numbers, and _ only.
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter Password"
                  {...register("password")}
                  className={`h-11 rounded-xl bg-white focus-visible:ring-blue-600 pr-10 border ${
                    errors.password
                      ? "border-red-300 focus-visible:ring-red-200"
                      : "border-gray-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 no-eye"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-500 ml-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  {...register("confirmPassword")}
                  className={`h-11 rounded-xl bg-white focus-visible:ring-blue-600 pr-10 border no-eye ${
                    errors.confirmPassword
                      ? "border-red-300 focus-visible:ring-red-200"
                      : "border-gray-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] text-red-500 ml-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-md mt-2 shadow-sm"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Sign Up"}
            </Button>

            <p className="text-[10px] text-center text-gray-500 pb-2">
              By joining, you agree to our Terms and Privacy Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
