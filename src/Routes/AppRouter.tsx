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

// --- LAZY IMPORTS ---
const AdminHomePage = lazy(() =>
  import("@/pages/AdminD/AdminHomePage").then((module) => ({
    default: module.AdminHomePage,
  }))
);
const CreateEvent = lazy(() => import("@/pages/AdminD/CreateEvent"));
const EditEvent = lazy(() => import("@/pages/AdminD/EditEvent"));
const ManageTeam = lazy(() => import("@/pages/AdminD/ManageTeam"));

const MainPetProfilePage = lazy(
  () => import("@/pages/PetProfile/MainPetProfilePage")
);
const AddPetPage = lazy(() => import("@/pages/PetProfile/AddPetPage"));
const PetProfilePage = lazy(() => import("@/pages/PetProfile/PetProfilePage"));
const PetEditProfile = lazy(() => import("@/pages/PetProfile/PetEditProfile"));

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
const UserHomePage = lazy(() =>
  import("@/pages/UsersD/UserHomePage").then((module) => ({
    default: module.UserHomePage,
  }))
);
const ProfilePage = lazy(() => import("@/pages/SharedPages/ProfilePage"));
const MenuPage = lazy(() => import("@/pages/SharedPages/MenuPage"));
const EditProfilePage = lazy(
  () => import("@/pages/SharedPages/EditProfilePage")
);
const MessagesPage = lazy(() => import("@/pages/Dummy/MessagesPage"));
const NotificationsPage = lazy(() => import("@/pages/Dummy/NotificationsPage"));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
  </div>
);

const router = createBrowserRouter([
  // ... Public Routes ...
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
      // ✅ CORRECTED: Admin Team Management
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

      // PET ROUTES
      {
        path: "/PetDashboard",
        element: (
          <Suspense fallback={<PageLoader />}>
            <MainPetProfilePage />
          </Suspense>
        ),
      },
      {
        // ✅ CORRECTED: Points to AddPetPage
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
  { path: "*", element: <Navigate to="/welcome" replace /> },
]);

export default function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
