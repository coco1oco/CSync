import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { FormEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      if (supabaseError) throw supabaseError;
      setMessage('If an account with that email exists, a password reset link has been sent.');
    } catch (err: any) {
      setError(err?.message ?? 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
};

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4 ">
        <form onSubmit={handleForgotPassword}>
            <div>
                <h1 className="">RESET PASSWORD</h1>
            </div>
            <div className="mb-2">
                <Label htmlFor="email" className="sr-only">
                    Enter your Email             
                </Label>
                <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-2xl bg-gray-500 text-white placeholder-gray-200 focus-visible:ring-gray-500 pr-10"
                />
            </div>
            <div className=" text-white ">
                <Button type="submit" disabled={loading} className="w-48 mx-auto block bg-gray-300 text-black hover:bg-gray-400 rounded-2xl">
                {loading ? 'Sending...' : 'Send Reset Link'}
               </Button>
            </div>
            {message && <p className="text-green-600">{message}</p>}
            {error && <p className="text-red-600">{error}</p>}
        </form>
    </div>
  );
}
