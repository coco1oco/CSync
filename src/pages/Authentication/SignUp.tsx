import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from "@/lib/supabaseClient";

export default function SignUp() {
  // Router navigation hook to redirect after sign up
  const navigate = useNavigate();
  // Form input states
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
   // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ error, setError] = useState<string>("");
  const [ loading, setLoading] = useState<boolean>(false);

   // Handle form submission when user clicks "Sign Up"
    const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page refresh
    setError(""); // Clear any previous errors

    // VALIDATION: Check if all fields are filled
    if (!email || !username || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    // VALIDATION: Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);// Show loading state on button

    try {
    // STEP 1: Create user account in Supabase Auth
      // This creates the email/password authentication
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
        // If sign up failed, throw the error
      if (authError) throw authError;

      // Get the newly created user
      const user = data?.user;

     // STEP 2: Create user profile in 'profiles' table
      // Store additional info like username and role
      if (user) {
      const { error: profileError } = await supabase
        .from("profiles")          // Table name
        .insert([                  // Insert a new row
          {
            id: user.id,           // Link to the auth user by id
            email,                 // Store email
            username,              // Store username
            // role will default to 'user' from database default
          },
        ]);

      // If profile creation failed, throw the error
      if (profileError) throw profileError;
      }

      // STEP 3: Redirect to sign in page
      // User will now sign in with their new account
      navigate("/SignIn");

    } catch (err: any) {
      // If any error occurred, display it to the user
      setError(err.message || "An error occurred during sign up");

    } finally {
      // Always stop loading (whether success or error)
      setLoading(false);
    }
  };

  // Render the sign up form

  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-sm p-8">
        {/* Title */}
        <h1 className="text-5xl font-Inter text-center mb-10">Sign Up</h1>

        {/* ADD THIS PART */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp}>
          {/* Email Address */}
            <div className="mb-4">
              <Label htmlFor="email" className="block text-sm mb-1 text-gray-600">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                type={showConfirmPassword? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
                className="rounded-2xl bg-gray-500 text-white placeholder-gray-200 focus-visible:ring-gray-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-8 text-gray-300 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Sign Up Button */}
            <Button 
             type="submit"
             disabled={loading}
             className="w-full bg-gray-300 text-black hover:bg-gray-400 rounded-2xl">
              Sign Up
            </Button>

            {/* Footer */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{" "}
              <Link to="/SignIn" className="font-medium text-gray-700 hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        
        </div>
      </div>
    );
}
