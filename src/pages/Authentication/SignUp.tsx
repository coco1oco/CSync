import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";

import logo from "@/assets/images/Pawpal.svg";
import heroBg from "@/assets/images/hero_2.jpg";

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

  const [emailError, setEmailError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [emailTouched, setEmailTouched] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // --- FIX: REDIRECT TO FEED ---
  useEffect(() => {
    if (user && !loading) {
      // Changed from "/ProfilePage" to "/"
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);
  // -----------------------------

  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,15}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // empty = no visual error; invalid text = error
  const validateEmail = (value: string) => {
    if (!value) return null;
    if (!emailRegex.test(value)) return "Invalid";
    return null;
  };

  const validateUsername = (value: string) => {
    if (!value) return null;
    if (!usernameRegex.test(value)) return "Invalid";
    return null;
  };

  const validatePassword = (value: string) => {
    if (!value) return null;
    if (!passwordRegex.test(value)) return "Invalid";
    return null;
  };

  const validateConfirmPassword = (value: string, pwd: string) => {
    if (!value) return null;
    if (value !== pwd) return "Mismatch";
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

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (usernameTouched) setUsernameError(validateUsername(value));
  };

  const handleUsernameBlur = () => {
    setUsernameTouched(true);
    setUsernameError(validateUsername(username));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordTouched) setPasswordError(validatePassword(value));

    if (confirmTouched) {
      setConfirmError(validateConfirmPassword(confirmPassword, value));
    }
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password));

    if (confirmTouched) {
      setConfirmError(validateConfirmPassword(confirmPassword, password));
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (confirmTouched) {
      setConfirmError(validateConfirmPassword(value, password));
    }
  };

  const handleConfirmPasswordBlur = () => {
    setConfirmTouched(true);
    setConfirmError(validateConfirmPassword(confirmPassword, password));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setEmailTouched(true);
    setUsernameTouched(true);
    setPasswordTouched(true);
    setConfirmTouched(true);

    // block if any required field is empty
    if (!email || !username || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    const emailErr = validateEmail(email);
    const usernameErr = validateUsername(username);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword, password);

    setEmailError(emailErr);
    setUsernameError(usernameErr);
    setPasswordError(passwordErr);
    setConfirmError(confirmErr);

    if (emailErr || usernameErr || passwordErr || confirmErr) {
      setError("Please fix highlighted fields.");
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
        const { error: profileError } = await supabase.from("profiles").upsert([
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

  const emailHasError = emailTouched && !!emailError;
  const usernameHasError = usernameTouched && !!usernameError;
  const passwordHasError = passwordTouched && !!passwordError;
  const confirmHasError = confirmTouched && !!confirmError;

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

          {error && (
            <div className="p-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-3">
            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
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
                className={`h-11 rounded-xl bg-white focus-visible:ring-blue-600 border ${
                  emailHasError ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
              <p
                className={`text-[10px] ${
                  emailHasError ? "text-red-500" : "text-gray-400"
                }`}
              >
                Use a valid email you can access.
              </p>
            </div>

            {/* Username */}
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                onBlur={handleUsernameBlur}
                placeholder="Username"
                required
                maxLength={30}
                minLength={3}
                className={`h-11 rounded-xl bg-white focus-visible:ring-blue-600 border ${
                  usernameHasError
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200"
                }`}
              />
              <p
                className={`text-[10px] ${
                  usernameHasError ? "text-red-500" : "text-gray-400"
                }`}
              >
                3–16 chars, letters, numbers, and _ only.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="Enter Password"
                  required
                  maxLength={30}
                  minLength={8}
                  className={`h-11 rounded-xl bg-white focus-visible:ring-blue-600 pr-10 border ${
                    passwordHasError
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p
                className={`text-[10px] ${
                  passwordHasError ? "text-red-500" : "text-gray-400"
                }`}
              >
                Min 8 chars: Upper, lower, number, special symbol.
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <Label htmlFor="confirmpassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmpassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onBlur={handleConfirmPasswordBlur}
                  placeholder="Confirm Password"
                  required
                  minLength={8}
                  className={`h-11 rounded-xl bg-white focus-visible:ring-blue-600 pr-10 border ${
                    confirmHasError
                      ? "border-red-300 bg-red-50"
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
              <p
                className={`text-[10px] ${
                  confirmHasError ? "text-red-500" : "text-gray-400"
                }`}
              >
                Must match the password above.
              </p>
            </div>

            <Button
              type="submit"
              disabled={signingUp}
              className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-md mt-2"
            >
              {signingUp ? <Loader2 className="animate-spin" /> : "Sign Up"}
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
