import { lazy, Suspense, useMemo } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/context/authContext";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import AppLayout from "@/components/AppLayout";
import AuthLayout from "@/components/AuthLayout";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { ChatProvider } from "@/context/ChatContext";

// --- LAZY IMPORTS ---

// ✅ UNIFIED DASHBOARD
const UnifiedDashboard = lazy(() =>
  import("@/pages/SharedPages/UnifiedDashboard").then((module) => ({
    default: module.UnifiedDashboard,
  }))
);

// Admin Pages
const CreateEvent = lazy(() => import("@/pages/AdminD/CreateEvent"));
const EditEvent = lazy(() => import("@/pages/AdminD/EditEvent"));
const ManageTeam = lazy(() => import("@/pages/AdminD/ManageTeam"));

// Pet Pages
const MainPetProfilePage = lazy(
  () => import("@/pages/PetProfile/MainPetProfilePage")
);
const AddPetPage = lazy(() => import("@/pages/PetProfile/AddPetPage"));
const PetProfilePage = lazy(() => import("@/pages/PetProfile/PetProfilePage"));
const PetEditProfile = lazy(() => import("@/pages/PetProfile/PetEditProfile"));
const CampusPetsPage = lazy(() => import("@/pages/PetProfile/CampusPetsPage"));

// ✅ PUBLIC PET PROFILE (For QR Codes)
const PublicPetProfile = lazy(
  () => import("@/pages/SharedPages/PublicPetProfile")
);

// Auth Pages
const Welcome = lazy(() => import("@/pages/Authentication/Welcome"));
const SignIn = lazy(() => import("@/pages/Authentication/SignIn"));
const SignUp = lazy(() => import("@/pages/Authentication/SignUp"));
const ForgotPassword = lazy(
  () => import("@/pages/Authentication/ForgotPassword")
);
const Unauthorized = lazy(() => import("@/pages/Authentication/Unauthorized"));
const UpdatePassword = lazy(
  () => import("@/pages/Authentication/UpdatePassword")
);

// Shared Pages
const ProfilePage = lazy(() => import("@/pages/SharedPages/ProfilePage"));
const MenuPage = lazy(() => import("@/pages/SharedPages/MenuPage"));
const EditProfilePage = lazy(
  () => import("@/pages/SharedPages/EditProfilePage")
);
const MessagesPage = lazy(() => import("@/pages/SharedPages/MessagesPage"));
const NotificationsPage = lazy(
  () => import("@/pages/SharedPages/NotificationsPage")
);

// Loading Spinner
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
  </div>
);

const router = createBrowserRouter([
  // -------------------------------------------------------------------------
  // 1. TRULY PUBLIC ROUTES (Accessible by ANYONE - Guest or Logged In)
  // -------------------------------------------------------------------------
  {
    path: "/lost-and-found/:petId",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicPetProfile />
      </Suspense>
    ),
  },

  // -------------------------------------------------------------------------
  // 2. GUEST ONLY ROUTES (Redirects to Dashboard if already logged in)
  // -------------------------------------------------------------------------
  {
    element: (
      <PublicRoute>
        <AuthLayout />
      </PublicRoute>
    ),
    children: [
      {
        path: "/welcome",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Welcome />
          </Suspense>
        ),
      },
      {
        path: "/SignIn",
        element: (
          <Suspense fallback={<PageLoader />}>
            <SignIn />
          </Suspense>
        ),
      },
      {
        path: "/SignUp",
        element: (
          <Suspense fallback={<PageLoader />}>
            <SignUp />
          </Suspense>
        ),
      },
      {
        path: "/ForgotPassword",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ForgotPassword />
          </Suspense>
        ),
      },
      {
        path: "/unauthorized",
        element: (
          <Suspense fallback={<PageLoader />}>
            <Unauthorized />
          </Suspense>
        ),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. PROTECTED ROUTES (Requires Login)
  // -------------------------------------------------------------------------
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      // Unified Dashboard
      {
        path: "/",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UnifiedDashboard />
          </Suspense>
        ),
      },
      {
        path: "/UserDashboard",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UnifiedDashboard />
          </Suspense>
        ),
      },
      {
        path: "/AdminDashboard",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <UnifiedDashboard />
            </Suspense>
          </ProtectedRoute>
        ),
      },

      // Account & Settings
      {
        path: "/reset-password",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UpdatePassword />
          </Suspense>
        ),
      },
      {
        path: "/messages",
        element: (
          <Suspense fallback={<PageLoader />}>
            <MessagesPage />
          </Suspense>
        ),
      },
      {
        path: "/notifications",
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotificationsPage />
          </Suspense>
        ),
      },

      // Admin Specific
      {
        path: "/admin/events/create",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <CreateEvent />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/events/edit/:id",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <EditEvent />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/team",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <ManageTeam />
            </Suspense>
          </ProtectedRoute>
        ),
      },

      // Shared / Profile
      {
        path: "/ProfilePage",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: "/ProfilePage/Edit",
        element: (
          <Suspense fallback={<PageLoader />}>
            <EditProfilePage />
          </Suspense>
        ),
      },
      {
        path: "/Menu",
        element: (
          <Suspense fallback={<PageLoader />}>
            <MenuPage />
          </Suspense>
        ),
      },

      // Pet Routes
      {
        path: "/PetDashboard",
        element: (
          <Suspense fallback={<PageLoader />}>
            <MainPetProfilePage />
          </Suspense>
        ),
      },
      {
        path: "/campus-pets",
        element: (
          <Suspense fallback={<PageLoader />}>
            <CampusPetsPage />
          </Suspense>
        ),
      },
      {
        path: "/PetDashboard/new",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AddPetPage />
          </Suspense>
        ),
      },
      {
        path: "/PetDashboard/:petId",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PetProfilePage />
          </Suspense>
        ),
      },
      {
        path: "/PetDashboard/:petId/edit",
        element: (
          <Suspense fallback={<PageLoader />}>
            <PetEditProfile />
          </Suspense>
        ),
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. CATCH ALL
  // -------------------------------------------------------------------------
  { path: "*", element: <Navigate to="/welcome" replace /> },
]);

export default function AppRouter() {
  const toastOffset = useMemo(() => {
    if (typeof window === "undefined") return 12;
    // Helper to avoid overlap with safe areas on mobile
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--safe-area-inset-top")
      .trim();
    const insetTop = Number.parseFloat(raw) || 0;
    return Math.ceil(insetTop + 12);
  }, []);

  return (
    <AuthProvider>
      <ChatProvider>
        <Toaster position="top-center" richColors offset={toastOffset} />
        <RouterProvider router={router} />
      </ChatProvider>
    </AuthProvider>
  );
}
