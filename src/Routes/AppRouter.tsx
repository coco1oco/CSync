import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/context/authContext";
import { ProtectedRoute } from "./ProtectedRoute";
import AppLayout from "@/components/AppLayout";

// Pages
import Welcome from "@/pages/Authentication/Welcome";
import SignIn from "@/pages/Authentication/SignIn";
import SignUp from "@/pages/Authentication/SignUp";
import ForgotPassword from "@/pages/Authentication/ForgotPassword";
import Unauthorized from "@/pages/Authentication/Unauthorized";

import { UserHomePage } from "@/pages/UsersD/UserHomePage";
import { AdminHomePage } from "@/pages/AdminD/AdminHomePage";
import ProfilePage from "@/pages/SharedPages/ProfilePage";
import MenuPage from "@/pages/SharedPages/MenuPage";
import EditProfilePage from "@/pages/SharedPages/EditProfilePage";

const router = createBrowserRouter([
  // --- PUBLIC ROUTES ---
  {
    path: "/welcome",
    element: <Welcome />,
  },
  {
    path: "/SignIn",
    element: <SignIn />,
  },
  {
    path: "/SignUp",
    element: <SignUp />,
  },
  {
    path: "/ForgotPassword",
    element: <ForgotPassword />,
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },

  // --- PROTECTED ROUTES (Wrapped in AppLayout) ---
  // This wrapper ensures all these pages get the Sidebar/BottomNav
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      // ROOT PATH: The Feed (Home)
      {
        path: "/",
        element: <UserHomePage />,
      },
      // Aliases for dashboards
      {
        path: "/UserDashboard",
        element: <UserHomePage />,
      },
      {
        path: "/AdminDashboard",
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminHomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/ProfilePage",
        element: <ProfilePage />,
      },
      {
        path: "/ProfilePage/Edit",
        element: <EditProfilePage />,
      },
      {
        path: "/Menu",
        element: <MenuPage />,
      },
    ],
  },

  // --- FALLBACK ---
  // If the route doesn't exist, send them to Welcome
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
