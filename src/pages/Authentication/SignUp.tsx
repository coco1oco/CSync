import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import React from "react";

export default function SignUp() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [signingUp, setSigningUp] = useState<boolean>(false);

  React.useEffect(() => {
    if (user && !loading) {
      navigate("/ProfilePage", { replace: true });
    }
  }, [user, loading, navigate]);

  // Username: starts with letter, 3–16 chars, letters/numbers/underscore
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,15}$/;

  // Password: 8+ chars, upper, lower, digit, special
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);

    if (!value) {
      setUsernameError(null);
      return;
    }

    if (!usernameRegex.test(value)) {
      setUsernameError(
        "Username must start with a letter and use 3–16 letters, numbers, or _."
      );
    } else {
      setUsernameError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);

    if (!value) {
      setPasswordError(null);
      setConfirmError(null);
      return;
    }

    if (!passwordRegex.test(value)) {
      setPasswordError(
        "Password must be 8+ chars and include upper, lower, number, and special."
      );
    } else {
      setPasswordError(null);
    }

    // re-check confirm password when main password changes
    if (confirmPassword && confirmPassword !== value) {
      setConfirmError("Passwords do not match.");
    } else {
      setConfirmError(null);
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setConfirmPassword(value);

    if (!value) {
      setConfirmError(null);
      return;
    }

    if (value !== password) {
      setConfirmError("Passwords do not match.");
    } else {
      setConfirmError(null);
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !username || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (usernameError || passwordError || confirmError) {
      setError("Please fix the errors before signing up");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSigningUp(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      const createdUser = data?.user;

      if (createdUser) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert([
            {
              id: createdUser.id,
              email,
              username,
            },
          ]);

        if (profileError) throw profileError;
      }

      console.log("SignUp successful, waiting for auth context...");
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "An error occurred during sign up");
      setSigningUp(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-sm p-8">
        <h1 className="text-5xl font-Inter text-center mb-10">Sign Up</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp}>
          <div className="mb-4">
            <Label htmlFor="email" className="block text-sm mb-1 text-gray-600">
              Email Address
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

          <div className="mb-4">
            <Label
              htmlFor="username"
              className="block text-sm mb-1 text-gray-600"
            >
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Username"
              required
              className="rounded-2xl bg-gray-500 text-white placeholder-gray-200 focus-visible:ring-gray-500"
            />
            {usernameError && (
              <p className="mt-1 text-xs text-red-500">{usernameError}</p>
            )}
          </div>

          <div className="mb-4 relative">
            <Label
              htmlFor="password"
              className="block text-sm mb-1 text-gray-600"
            >
              Enter Password
            </Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter Password"
              required
              maxLength={30}
              minLength={8}
              className="rounded-2xl bg-gray-200 focus-visible:ring-gray-400 pr-10"
            />
            {passwordError && (
              <p className="mt-1 text-xs text-red-500">{passwordError}</p>
            )}

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="mb-6 relative">
            <Label
              htmlFor="confirm-password"
              className="block text-sm mb-1 text-gray-600"
            >
              Confirm Password
            </Label>
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="Confirm Password"
              required
              className="rounded-2xl bg-gray-500 text-white placeholder-gray-200 focus-visible:ring-gray-500 pr-10"
            />
            {confirmError && (
              <p className="mt-1 text-xs text-red-500">{confirmError}</p>
            )}

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              className="absolute right-3 top-8 text-gray-300 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={signingUp}
            className="w-full bg-gray-300 text-black hover:bg-gray-400 rounded-2xl"
          >
            {signingUp ? "Signing up..." : "Sign Up"}
          </Button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/SignIn"
              className="font-medium text-gray-700 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
