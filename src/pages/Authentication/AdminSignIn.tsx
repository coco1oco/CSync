import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/authContext";

// ✅ Your secret key (set in your .env file)
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET;

export default function AdminSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Handle admin login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1️⃣ Check the secret key first
    if (secret.trim() !== ADMIN_SECRET) {
      alert("Invalid admin access key");
      return;
    }

    // 2️⃣ Continue to Supabase login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);

    // 3️⃣ Fetch role from profiles table
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user?.id)
      .single();

    if (profileErr) return alert(profileErr.message);
    if (profile.role !== "admin") return alert("Not an admin account");

    // 4️⃣ Store session and navigate
    login(email, "admin");
    navigate("/admin");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-sm p-8">
        {/* Title */}
        <h1 className="text-4xl font-Inter text-center mb-10">Admin Sign In</h1>

        {/* ✅ Wrap inputs and button in a form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-4">
            <Label htmlFor="username" className="sr-only">
              Email
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
          <div className="mb-4 relative">
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

          {/* 🔒 Secret Key */}
          <div className="mb-6">
            <Label htmlFor="secret" className="sr-only">
              Secret Key
            </Label>
            <Input
              id="secret"
              type="password"
              placeholder="Admin Access Key"
              required
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="rounded-2xl bg-gray-200 focus-visible:ring-gray-400"
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Checkbox id="remember" />
            <Label htmlFor="remember" className="text-sm text-gray-500">
              Remember Me
            </Label>
          </div>

          {/* ✅ Submit Button */}
          <Button
            type="submit"
            className="w-48 mx-auto block bg-gray-300 text-black hover:bg-gray-400 rounded-2xl"
          >
            Sign In
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Not for public access.
        </p>
      </div>
    </div>
  );
}
