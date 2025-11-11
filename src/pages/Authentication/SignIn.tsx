import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('')
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-sm p-8">
        {/* Title */}
        <h1 className="text-4xl font-Inter text-center mb-10">Sign In</h1>

        {/* ✅ Wrap inputs and button in a form */}
        <form>
          {/* Username */}
          <div className="mb-4">
            <Label htmlFor="username" className="sr-only">
              Username
            </Label>
            <Input
              id="username"
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl bg-gray-200 focus-visible:ring-gray-400"
            />
          </div>

          {/* Password */}
          <div className="mb-2 relative">
            <Label htmlFor="password" className="sr-only">
              Password
            </Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* Forgot Password */}
          <div className="text-right mb-4">
            <a
              href="https://www.facebook.com/"
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Forgot Password?
            </a>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Checkbox id="remember" />
            <Label htmlFor="remember" className="text-sm text-gray-500">
              Remember Me
            </Label>
          </div>

          {/* ✅ The button will now trigger handleSubmit */}
          <Button
            type="submit"
            className="w-48 mx-auto block bg-gray-300 text-black hover:bg-gray-400 rounded-2xl"
          >
            Sign In
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don’t have an account?{" "}
          <a href="/SignUp" className="font-medium text-gray-700 hover:underline">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}
