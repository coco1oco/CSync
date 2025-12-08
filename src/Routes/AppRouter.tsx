import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/context/authContext";
import { ProtectedRoute } from "./ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import AuthLayout from "@/components/AuthLayout";
import { Loader2 } from "lucide-react";

// --- LAZY LOADED PAGES ---
// Authentication
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

// Main Features (Handling Named Exports)
const UserHomePage = lazy(() =>
  import("@/pages/UsersD/UserHomePage").then((module) => ({
    default: module.UserHomePage,
  }))
);
const AdminHomePage = lazy(() =>
  import("@/pages/AdminD/AdminHomePage").then((module) => ({
    default: module.AdminHomePage,
  }))
);

// Events
const CreateEvent = lazy(() => import("@/pages/AdminD/CreateEvent"));
const EditEvent = lazy(() => import("@/pages/AdminD/EditEvent"));

// Profile & Menu
const ProfilePage = lazy(() => import("@/pages/SharedPages/ProfilePage"));
const MenuPage = lazy(() => import("@/pages/SharedPages/MenuPage"));
const EditProfilePage = lazy(
  () => import("@/pages/SharedPages/EditProfilePage")
);

// Pet Profile
const MainPetProfilePage = lazy(
  () => import("@/pages/PetProfile/MainPetProfilePage")
);
const AddPetPage = lazy(() => import("@/pages/PetProfile/AddPetPage"));
const PetProfilePage = lazy(() => import("@/pages/PetProfile/PetProfilePage"));
const PetEditProfile = lazy(() => import("@/pages/PetProfile/PetEditProfile"));

// Dummy Pages
const MessagesPage = lazy(() => import("@/pages/Dummy/MessagesPage"));
const NotificationsPage = lazy(() => import("@/pages/Dummy/NotificationsPage"));

// --- LOADING FALLBACK ---
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
  </div>
);

const router = createBrowserRouter([
  // --- PUBLIC ROUTES ---
  {
    element: <AuthLayout />,
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
        path: "/reset-password",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UpdatePassword />
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

  // --- PROTECTED ROUTES ---
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
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
      {
        path: "/",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserHomePage />
          </Suspense>
        ),
      },
      {
        path: "/UserDashboard",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserHomePage />
          </Suspense>
        ),
      },
      {
        path: "/AdminDashboard",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <AdminHomePage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
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
      {
        path: "/PetDashboard",
        element: (
          <Suspense fallback={<PageLoader />}>
            <MainPetProfilePage />
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

  // --- FALLBACK ---
  {
    path: "*",
    element: <Navigate to="/welcome" replace />,
  },
]);

export default function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
