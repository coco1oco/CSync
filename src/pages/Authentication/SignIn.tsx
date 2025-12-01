import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";

import logo from "@/assets/images/Pawpal.svg";
import heroBg from "@/assets/images/hero_3.jpg";

export default function SignIn() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [signingIn, setSigningIn] = useState<boolean>(false);

  // validation state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate(
        // adjust if you store role differently
        (user as any).role === "admin" ? "/AdminDashboard" : "/UserDashboard",
        { replace: true }
      );
    }
  }, [user, loading, navigate]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // empty = no visual error, only validate non‑empty
  const validateEmail = (value: string) => {
    if (!value) return null;
    if (!emailRegex.test(value)) return "Invalid";
    return null;
  };

  const validatePassword = (value: string) => {
    if (!value) return null;
    // optional: add strength rule if you want
    if (value.length < 8) return "Invalid";
    return null;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailTouched) setEmailError(validateEmail(value));
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordTouched) setPasswordError(validatePassword(value));
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setEmailTouched(true);
    setPasswordTouched(true);

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    const emailErr = validateEmail(email);
    const pwdErr = validatePassword(password);
    setEmailError(emailErr);
    setPasswordError(pwdErr);

    if (emailErr || pwdErr) {
      setError("Please fix highlighted fields.");
      return;
    }

    setSigningIn(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError(signInError.message);
        setSigningIn(false);
        return;
      }

      if (data.user) {
        await supabase
          .from("profiles")
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq("id", data.user.id);
      }

      // let auth context + useEffect handle redirect
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "An error occurred");
      setSigningIn(false);
    }
  };

  const emailHasError = emailTouched && !!emailError;
  const passwordHasError = passwordTouched && !!passwordError;

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
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

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <img
              src={logo}
              alt="PawPal"
              className="h-16 w-auto mx-auto lg:mx-0 mb-6"
            />
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              New to PawPal?{" "}
              <Link
                to="/SignUp"
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Create an account
              </Link>
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-6">
            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="name@example.com"
                required
                maxLength={30}
                minLength={5}
                className={`h-12 rounded-xl bg-white focus-visible:ring-blue-600 border ${
                  emailHasError ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
              <p
                className={`mt-1 text-xs ${
                  emailHasError ? "text-red-500" : "text-gray-500"
                }`}
              >
                Use the email you registered with.
              </p>
            </div>

            {/* Password */}
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
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="Enter your password"
                  required
                  className={`h-12 rounded-xl bg-white focus-visible:ring-blue-600 pr-10 border ${
                    passwordHasError
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p
                className={`mt-1 text-xs ${
                  passwordHasError ? "text-red-500" : "text-gray-500"
                }`}
              >
                At least 8 characters.
              </p>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              disabled={signingIn}
              className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-md"
            >
              {signingIn ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
