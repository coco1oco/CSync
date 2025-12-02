import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/authContext";
import logo from "@/assets/images/Pawpal.svg";
import heroBg from "@/assets/images/hero_1.jpg";

export default function Welcome() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Safety Check: If user is already logged in, send them to the Feed
  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-white overflow-hidden">
      {/* LEFT SECTION (Desktop Only - Hero Image) */}
      {/* 'hidden' on mobile, 'lg:block' on desktop */}
      <div className="hidden lg:block lg:w-1/2 lg:h-full bg-blue-50 overflow-hidden shrink-0 relative">
        <img
          src={heroBg}
          alt="Happy Dog"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />

        {/* Logo Overlay - Clean Version (No Blur/Glass) */}
        <div className="absolute inset-0 flex items-center justify-center bg-blue-900/10 backdrop-blur-[1px]">
          <div className="w-64 h-64 flex items-center justify-center animate-in zoom-in duration-700">
            <img
              src={logo}
              alt="PawPal Logo"
              // 'rounded-full' ensures it stays circular
              // 'shadow-2xl' makes it pop off the background
              className="w-full h-full object-contain rounded-full shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* RIGHT SECTION (Content) */}
      <div className="w-full flex-1 lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative bg-white">
        <div className="w-full max-w-lg space-y-10">
          {/* Mobile Logo (Visible only on mobile since Hero is hidden) */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logo} alt="PawPal" className="h-32 w-32 object-contain" />
          </div>

          {/* Headings */}
          <div className="space-y-6 text-center lg:text-left">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-blue-950 leading-tight">
              Pet care, <br /> simplified.
            </h1>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Join the community today.
            </h2>
          </div>

          {/* Buttons Stack */}
          <div className="space-y-4 w-full max-w-xs mx-auto lg:mx-0">
            <Link
              to="/SignUp"
              className="flex items-center justify-center w-full h-12 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              Create Account
            </Link>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">
                or
              </span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <Link
              to="/SignIn"
              className="flex items-center justify-center w-full h-12 rounded-full bg-white text-blue-600 border border-gray-200 font-bold hover:bg-blue-50 transition-all active:scale-95"
            >
              Sign In
            </Link>
          </div>

          {/* Footer */}
          <p className="text-xs text-center lg:text-left text-gray-400 leading-relaxed max-w-sm mx-auto lg:mx-0">
            By signing up, you agree to our{" "}
            <span className="text-blue-600 cursor-pointer hover:underline">
              Terms
            </span>
            ,{" "}
            <span className="text-blue-600 cursor-pointer hover:underline">
              Privacy Policy
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
