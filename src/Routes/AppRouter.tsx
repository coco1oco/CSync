import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import AppLayout from "@/components/AppLayout";
import RootBoundary from "@/components/RootBoundary"; // Import the new file
import AuthLayout from "@/components/AuthLayout";
import { Loader2 } from "lucide-react";

// --- LAZY IMPORTS ---
const UnifiedDashboard = lazy(() =>
  import("@/pages/SharedPages/UnifiedDashboard").then((m) => ({
    default: m.UnifiedDashboard,
  })),
);
const CreateEvent = lazy(() => import("@/pages/admin/CreateEvent"));
const EditEvent = lazy(() => import("@/pages/admin/EditEvent"));
const ManageTeam = lazy(() => import("@/pages/admin/ManageTeam"));
const CreateOfficialEvent = lazy(
  () => import("@/pages/admin/CreateOfficialEvent"),
);
const ManageEventsPage = lazy(() => import("@/pages/admin/ManageEventsPage"));
const EditOfficialEvent = lazy(() => import("@/pages/admin/EditOfficialEvent"));
const MainPetProfilePage = lazy(
  () => import("@/pages/PetProfile/MainPetProfilePage"),
);
const AddPetPage = lazy(() => import("@/pages/PetProfile/AddPetPage"));
const PetProfilePage = lazy(() => import("@/pages/PetProfile/PetProfilePage"));
const PetEditProfile = lazy(() => import("@/pages/PetProfile/PetEditProfile"));
const CampusPetsPage = lazy(() => import("@/pages/PetProfile/CampusPetsPage"));
const PublicPetProfile = lazy(
  () => import("@/pages/SharedPages/PublicPetProfile"),
);
const Welcome = lazy(() => import("@/pages/Authentication/Welcome"));
const SignIn = lazy(() => import("@/pages/Authentication/SignIn"));
const SignUp = lazy(() => import("@/pages/Authentication/SignUp"));
const ForgotPassword = lazy(
  () => import("@/pages/Authentication/ForgotPassword"),
);
const Unauthorized = lazy(() => import("@/pages/Authentication/Unauthorized"));
const UpdatePassword = lazy(
  () => import("@/pages/Authentication/UpdatePassword"),
);
const ProfilePage = lazy(() => import("@/pages/SharedPages/ProfilePage"));
const MenuPage = lazy(() => import("@/pages/SharedPages/MenuPage"));
const EditProfilePage = lazy(
  () => import("@/pages/SharedPages/EditProfilePage"),
);
const MessagesPage = lazy(() => import("@/pages/SharedPages/MessagesPage"));
const NotificationsPage = lazy(() =>
  import("@/pages/SharedPages/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const EventDetails = lazy(() => import("@/pages/SharedPages/EventDetails"));
const SettingsPage = lazy(() => import("@/pages/MenuPage/SettingsPage"));
const OfficialEventDetails = lazy(
  () => import("@/pages/SharedPages/OfficialEventDetails"),
);

// ✅ NEW: Import Challenge Page
const ChallengeDetailsPage = lazy(
  () => import("@/pages/SharedPages/ChallengeDetailsPage"),
);
const MyTicketsPage = lazy(() => import("@/pages/SharedPages/MyTicketsPage"));
// Loading Spinner
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
  </div>
);

const CreateChallenge = lazy(() => import("@/pages/admin/CreateChallenge"));

const router = createBrowserRouter([
  // 1. PUBLIC (QR CODES)
  {
    path: "/lost-and-found/:petId",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicPetProfile />
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
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RootBoundary />, // <--- ADD THIS LINE HERE
    children: [
      // ... your other routes
    ],
  },

  // 2. GUEST ONLY
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
    ],
  },
  // 3. PROTECTED
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

      // ✅ NEW: Challenge Route
      {
        path: "/challenges/current",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChallengeDetailsPage />
          </Suspense>
        ),
      },

      // Admin Events
      {
        path: "/admin/events/new-official",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <CreateOfficialEvent />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // ✅ NEW: Challenge Creation Route
      {
        path: "/admin/challenges/create",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <CreateChallenge />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/challenges/view/:id",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChallengeDetailsPage />
          </Suspense>
        ),
      },
      {
        path: "/official-event/:id",
        element: (
          <Suspense fallback={<PageLoader />}>
            <OfficialEventDetails />
          </Suspense>
        ),
      },
      {
        path: "/admin/events/manage",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <ManageEventsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/events/edit-official/:id",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <EditOfficialEvent />
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
        path: "/admin/team",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Suspense fallback={<PageLoader />}>
              <ManageTeam />
            </Suspense>
          </ProtectedRoute>
        ),
      },

      // Account & Features
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
      {
        path: "/event/:id",
        element: (
          <Suspense fallback={<PageLoader />}>
            <EventDetails />
          </Suspense>
        ),
      },

      // Shared
      {
        path: "/ProfilePage",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: "/my-tickets",
        element: (
          <Suspense fallback={<PageLoader />}>
            <MyTicketsPage />
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

      // Pets
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
      {
        path: "/settings",
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },
  // 4. CATCH ALL
  { path: "*", element: <Navigate to="/welcome" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
