import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from  "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";

export default function SignIn() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form input states
  const [email, setEmail] = useState<string>("");           // Store email input
  const [password, setPassword] = useState<string>("");     // Store password input
  // UI states
  const [showPassword, setShowPassword] = useState<boolean>(false);  // Toggle password visibility
  const [_rememberMe, setRememberMe] = useState<boolean>(false);    // Remember me checkbox (using _ because we don't use it yet)
  const [error, setError] = useState<string>("");           // Store error messages
  const [loading, setLoading] = useState<boolean>(false); 

   useEffect(() => {
    if (user) {
      // If user is admin, go to admin dashboard
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        // Otherwise go to regular user dashboard
        navigate("/dashboard");
      }
    }
  }, [user, navigate]); // Run when 'user' changes

  // Handle form submission when user clicks "Sign In"
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page refresh
    setError(""); // Clear any previous errors
  
  
    // VALIDATION: Check if both email and password are filled
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true); // Show loading state on button

    try {
      // STEP 1: Sign in with Supabase Auth
      // This checks the email/password against Supabase auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If sign in failed, throw the error
      if (signInError) throw signInError;

       // STEP 2: Update last_sign_in_at timestamp in profiles table
      // This tracks when the user last logged in
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ last_sign_in_at: new Date().toISOString() })  // Set to current time
          .eq("id", data.user.id);                                 // For this user
      }

      // STEP 3: AuthContext automatically detects the sign in
      // It will fetch the user's profile and redirect based on role
      // The useEffect above will handle the redirect

    } catch (err: any) {
      // If any error occurred, display it to the user
      setError(err.message || "An error occurred during sign in");
    
    } finally {
      // Always stop loading (whether success or error)
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-sm p-8">
        {/* Title */}
        <h1 className="text-4xl font-Inter text-center mb-10">Sign In</h1>

        {/* ✅ Wrap inputs and button in a form */}
        <form onSubmit={handleSignIn}>
          {/* Username */}
          <div className="mb-4">
            <Label htmlFor="username" className="sr-only">
              Username
            </Label>
            <Input
              id="username"
              type="email"
              value={email}
               onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
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
           <input
              type="checkbox"
              checked={_rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              id="rememberMe"
              className="w-4 h-4"
            />
            <Label htmlFor="remember" className="text-sm text-gray-500">
              Remember Me
            </Label>
          </div>

          {/* ✅ The button will now trigger handleSubmit */}
          <Button
            type="submit"
            disabled={loading}  
            className="w-48 mx-auto block bg-gray-300 text-black hover:bg-gray-400 rounded-2xl"
          >
            Sign In
          </Button>
          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don’t have an account?{" "}
            <Link to="/SignUp" className="font-medium text-gray-700 hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
