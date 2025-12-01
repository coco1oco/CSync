import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
// UPDATED IMPORTS
import logo from "@/assets/images/Pawpal.svg";
import heroBg from "@/assets/images/hero_4.jpg";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const { error: supabaseError } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (supabaseError) throw supabaseError;
      setMessage("If an account exists, we sent a reset link to your email.");
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* LEFT SIDE: Hero Image */}
      <div className="hidden lg:flex w-1/2 bg-blue-50 items-center justify-center relative overflow-hidden">
        {/* Background Image */}
        <img
          src={heroBg}
          alt="Waiting Dog"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent" />
        <div className="absolute bottom-12 left-12 text-white p-8 max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Don't worry.</h1>
          <p className="text-lg opacity-90">
            It happens to the best of us. Let's get you back to your pets.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: The Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="text-center lg:text-left">
            <img
              src={logo}
              alt="PawPal"
              className="h-16 w-auto mx-auto lg:mx-0 mb-6"
            />
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Enter your email and we'll send you a link to get back into your
              account.
            </p>
          </div>

          {/* Messages */}
          {message && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700 font-medium animate-in fade-in">
              {message}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-white border-gray-200 focus-visible:ring-blue-600 pl-10"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-md shadow-sm transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                "Send Reset Link"
              )}
            </Button>

            <div className="text-center mt-4">
              <Link
                to="/SignIn"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
