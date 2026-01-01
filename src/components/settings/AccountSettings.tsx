import { useState } from "react";
import {
  Lock,
  Save,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useAuth } from "@/context/authContext";
import FailedImageIcon from "@/assets/FailedImage.svg";

// --- PASSWORD SCHEMA ---
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(1, "New password is required")
      .regex(
        PASSWORD_REGEX,
        "Min 8 chars: Upper, lower, number, and special symbol."
      ),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

export function AccountSettings() {
  const { user, updatePassword } = useAuth();

  // password toggle state
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [success, setSuccess] = useState("");
  const [generalError, setGeneralError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    mode: "onBlur",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordChangeValues) => {
    if (!user) return;

    setGeneralError("");
    setSuccess("");

    try {
      // 1) change password
      await updatePassword(data.currentPassword, data.newPassword);

      setSuccess("Password updated successfully!");
      reset();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error(err);
      setGeneralError(
        err.message || "Failed to update password. Please try again."
      );
    }
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">Account Center</h2>
        <p className="text-sm text-gray-500">
          Manage your personal information and login security.
        </p>
      </div>

      {/* Alerts */}
      {generalError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {generalError}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      {/* USER INFO (Display Only) */}
      <div className="flex items-center gap-6 p-4 mb-8 bg-gray-50/80 rounded-xl border border-gray-100">
        <div className="shrink-0">
          <div className="w-16 h-16 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-200 ring-1 ring-gray-100">
            <img
              src={user?.avatar_url || FailedImageIcon}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg">
            {user?.first_name} {user?.last_name}
          </h3>
          <p className="text-xs text-gray-500">{user?.role || "User"}</p>
          <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
        </div>
      </div>

      {/* PASSWORD FORM */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Current Password */}
        <div className="md:grid md:grid-cols-4 md:gap-6 items-start">
          <label className="text-sm font-medium text-gray-700 md:text-right md:pt-3 flex items-center gap-2 md:justify-end">
            <Lock size={16} className="text-gray-400" /> Current Password
          </label>
          <div className="md:col-span-3 mt-1 md:mt-0">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your current password"
                {...register("currentPassword")}
                className={`w-full max-w-lg p-2.5 pr-10 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                  errors.currentPassword
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-[11px] text-red-500 mt-1.5">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
        </div>

        {/* New Password */}
        <div className="md:grid md:grid-cols-4 md:gap-6 items-start">
          <label className="text-sm font-medium text-gray-700 md:text-right md:pt-3 flex items-center gap-2 md:justify-end">
            <Lock size={16} className="text-gray-400" /> New Password
          </label>
          <div className="md:col-span-3 mt-1 md:mt-0">
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New password"
                {...register("newPassword")}
                className={`w-full max-w-lg p-2.5 pr-10 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                  errors.newPassword
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() =>
                  setShowNewPassword(!showNewPassword)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword ? (
              <p className="text-[11px] text-red-500 mt-1.5">
                {errors.newPassword.message}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1.5">
                Min 8 chars: upper, lower, number, and special symbol.
              </p>
            )}
          </div>
        </div>

        {/* Confirm Password */}
        <div className="md:grid md:grid-cols-4 md:gap-6 items-start">
          <label className="text-sm font-medium text-gray-700 md:text-right md:pt-3 flex items-center gap-2 md:justify-end">
            <Lock size={16} className="text-gray-400" /> Confirm Password
          </label>
          <div className="md:col-span-3 mt-1 md:mt-0">
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter new password"
                {...register("confirmPassword")}
                className={`w-full max-w-lg p-2.5 pr-10 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                  errors.confirmPassword
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-red-500 mt-1.5">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="md:grid md:grid-cols-4 md:gap-6 pt-4">
          <div className="md:col-start-2 md:col-span-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}