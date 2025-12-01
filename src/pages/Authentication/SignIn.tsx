import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";

export default function SignIn() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [signingIn, setSigningIn] = useState<boolean>(false);

  // ✅ Redirect after login
  useEffect(() => {
    console.log("SignIn useEffect - user:", user, "loading:", loading);
    
    if (!loading && user) {
      console.log("🎯 REDIRECTING to dashboard");
      navigate(user.role === "admin" ? "/AdminDashboard" : "/UserDashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setSigningIn(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setSigningIn(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem("rememberMeEmail", email);
      } else {
        localStorage.removeItem("rememberMeEmail");
      }

      if (data.user) {
        await supabase
          .from("profiles")
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq("id", data.user.id);
      }

      console.log("SignIn successful, waiting for context to update...");
      // ✅ Let the useEffect handle redirect - don't call setSigningIn(false) yet

    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "An error occurred");
      setSigningIn(false);
    }
  };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // common simple pattern [web:92][web:88]
  
    const [emailError, setEmailError] = useState<string | null>(null);
  
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setEmail(value);
  
      if (!value) {
        setEmailError(null);
        return;
      }
  
      if (!emailRegex.test(value)) {
        setEmailError("Enter a valid email address.");
      } else {
        setEmailError(null);
      }
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-sm p-8">
        <h1 className="text-4xl font-Inter text-center mb-10">Sign In</h1>

        <form onSubmit={handleSignIn}>
          <div className="mb-4">
            <Label htmlFor="email" className="sr-only">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Email Address"
              required
              maxLength={30}
              minLength={10}
              className="rounded-2xl bg-gray-200 focus-visible:ring-gray-400"
            />
            {emailError && (
              <p className="mt-1 text-xs text-red-500">{emailError}</p>
            )}
          </div>

          <div className="mb-2 relative">
            <Label htmlFor="password" className="sr-only">
              Password
            </Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="rounded-2xl bg-gray-700 text-white placeholder-gray-300 focus-visible:ring-gray-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-300 hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="text-right mb-4">
            <Link
              to="/ForgotPassword"
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="flex items-center justify-center space-x-2 mb-6">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              id="rememberMe"
              className="w-4 h-4"
            />
            <Label htmlFor="rememberMe" className="text-sm text-gray-500">
              Remember Me
            </Label>
          </div>

          {error && <div className="text-red-600 mb-4 text-sm">{error}</div>}

          <Button
            type="submit"
            disabled={signingIn}
            className="w-48 mx-auto block bg-gray-300 text-black hover:bg-gray-400 rounded-2xl"
          >
            {signingIn ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <Link to="/SignUp" className="font-medium text-gray-700 hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
