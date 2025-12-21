import { lazy, Suspense, useMemo, memo } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/authContext";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import AppLayout from "@/components/AppLayout";
import AuthLayout from "@/components/AuthLayout";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { ChatProvider } from "@/context/ChatContext";

// --- LAZY IMPORTS ---
const AdminHomePage = lazy(() =>
  import("@/pages/AdminD/AdminHomePage").then((module) => ({
    default: module.AdminHomePage,
  })).catch((error) => {
    console.error('Failed to load AdminHomePage:', error);
    throw error;
  })
);
const CreateEvent = lazy(() => import("@/pages/AdminD/CreateEvent").catch((error) => {
  console.error('Failed to load CreateEvent:', error);
  throw error;
}));
const EditEvent = lazy(() => import("@/pages/AdminD/EditEvent").catch((error) => {
  console.error('Failed to load EditEvent:', error);
  throw error;
}));
const ManageTeam = lazy(() => import("@/pages/AdminD/ManageTeam").catch((error) => {
  console.error('Failed to load ManageTeam:', error);
  throw error;
}));

const MainPetProfilePage = lazy(() =>
  import("@/pages/PetProfile/MainPetProfilePage").catch((error) => {
    console.error('Failed to load MainPetProfilePage:', error);
    throw error;
  })
);
const AddPetPage = lazy(() => import("@/pages/PetProfile/AddPetPage").catch((error) => {
  console.error('Failed to load AddPetPage:', error);
  throw error;
}));
const PetProfilePage = lazy(() => import("@/pages/PetProfile/PetProfilePage").catch((error) => {
  console.error('Failed to load PetProfilePage:', error);
  throw error;
}));
const PetEditProfile = lazy(() => import("@/pages/PetProfile/PetEditProfile").catch((error) => {
  console.error('Failed to load PetEditProfile:', error);
  throw error;
}));
const CampusPetsPage = lazy(() => import("@/pages/PetProfile/CampusPetsPage").catch((error) => {
  console.error('Failed to load CampusPetsPage:', error);
  throw error;
}));

const Welcome = lazy(() => import("@/pages/Authentication/Welcome").catch((error) => {
  console.error('Failed to load Welcome:', error);
  throw error;
}));
const SignIn = lazy(() => import("@/pages/Authentication/SignIn").catch((error) => {
  console.error('Failed to load SignIn:', error);
  throw error;
}));
const SignUp = lazy(() => import("@/pages/Authentication/SignUp").catch((error) => {
  console.error('Failed to load SignUp:', error);
  throw error;
}));
const ForgotPassword = lazy(() =>
  import("@/pages/Authentication/ForgotPassword").catch((error) => {
    console.error('Failed to load ForgotPassword:', error);
    throw error;
  })
);
const Unauthorized = lazy(() => import("@/pages/Authentication/Unauthorized").catch((error) => {
  console.error('Failed to load Unauthorized:', error);
  throw error;
}));
const UpdatePassword = lazy(() =>
  import("@/pages/Authentication/UpdatePassword").catch((error) => {
    console.error('Failed to load UpdatePassword:', error);
    throw error;
  })
);
const UserHomePage = lazy(() =>
  import("@/pages/UsersD/UserHomePage").then((module) => ({
    default: module.UserHomePage,
  })).catch((error) => {
    console.error('Failed to load UserHomePage:', error);
    throw error;
  })
);
const ProfilePage = lazy(() => import("@/pages/SharedPages/ProfilePage").catch((error) => {
  console.error('Failed to load ProfilePage:', error);
  throw error;
}));
const MenuPage = lazy(() => import("@/pages/SharedPages/MenuPage").catch((error) => {
  console.error('Failed to load MenuPage:', error);
  throw error;
}));
const EditProfilePage = lazy(() =>
  import("@/pages/SharedPages/EditProfilePage").catch((error) => {
    console.error('Failed to load EditProfilePage:', error);
    throw error;
  })
);
const MessagesPage = lazy(() => import("@/pages/SharedPages/MessagesPage").catch((error) => {
  console.error('Failed to load MessagesPage:', error);
  throw error;
}));
const NotificationsPage = lazy(() =>
  import("@/pages/SharedPages/NotificationsPage").then((module) => ({
    default: module.NotificationsPage,
  })).catch((error) => {
    console.error('Failed to load NotificationsPage:', error);
    throw error;
  })
);
const EventDetailPage = lazy(() =>
  import("@/pages/SharedPages/EventDetailPage").then((module) => ({
    default: module.EventDetailPage,
  })).catch((error) => {
    console.error('Failed to load EventDetailPage:', error);
    throw error;
  })
);

const PageLoader = memo(() => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
  </div>
));
PageLoader.displayName = 'PageLoader';

// 🔀 Route-level switch: send admins to the admin feed, everyone else to the user feed
const RoleBasedHome = memo(function RoleBasedHome() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (user?.role === "admin") {
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminHomePage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <UserHomePage />
    </Suspense>
  );
});
RoleBasedHome.displayName = 'RoleBasedHome';

const router = createBrowserRouter(
  [
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
          <RoleBasedHome />
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
      // ✅ ADD THIS ROUTE for viewing a single event
      {
        path: "/event/:eventId",
        element: (
          <Suspense fallback={<PageLoader />}>
            <EventDetailPage />
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
  { path: "*", element: <Navigate to="/welcome" replace /> },
],
{
  future: {
    v7_startTransition: true,
  },
}
);

export default function AppRouter() {
  return (
    <AuthProvider>
      <ChatProvider>
        <Toaster position="top-center" richColors offset={12} />
        <RouterProvider router={router} />
      </ChatProvider>
    </AuthProvider>
  );
}
