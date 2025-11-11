import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-sm p-8">
        {/* Title */}
        <h1 className="text-5xl font-Inter text-center mb-10">Sign Up</h1>

        {/* Email Address */}
        <div className="mb-4">
          <Label htmlFor="email" className="block text-sm mb-1 text-gray-600">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Email Address"
            required
            className="rounded-2xl bg-gray-200 focus-visible:ring-gray-400"
          />
        </div>

        {/* Username */}
        <div className="mb-4">
          <Label htmlFor="username" className="block text-sm mb-1 text-gray-600">
            Username
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="Username"
            required
            className="rounded-2xl bg-gray-500 text-white placeholder-gray-200 focus-visible:ring-gray-500"
          />
        </div>

        {/* Enter Password */}
        <div className="mb-4 relative">
          <Label htmlFor="password" className="block text-sm mb-1 text-gray-600">
            Enter Password
          </Label>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter Password"
            required
            className="rounded-2xl bg-gray-200 focus-visible:ring-gray-400 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="mb-6 relative">
          <Label
            htmlFor="confirm-password"
            className="block text-sm mb-1 text-gray-600"
          >
            Confirm Password
          </Label>
          <Input
            id="confirm-password"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm Password"
            required
            className="rounded-2xl bg-gray-500 text-white placeholder-gray-200 focus-visible:ring-gray-500 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-8 text-gray-300 hover:text-white"
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Sign Up Button */}
        <Button className="w-full bg-gray-300 text-black hover:bg-gray-400 rounded-2xl">
          Sign Up
        </Button>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <a href="/SignIn" className="font-medium text-gray-700 hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
