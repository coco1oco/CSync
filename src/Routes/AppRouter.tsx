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
import UpdatePassword from "@/pages/Authentication/UpdatePassword";

import { UserHomePage } from "@/pages/UsersD/UserHomePage";
import { AdminHomePage } from "@/pages/AdminD/AdminHomePage";
import CreateEvent from "@/pages/AdminD/CreateEvent";
import EditEvent from "@/pages/AdminD/EditEvent"; // ✅ IMPORT THIS
import ProfilePage from "@/pages/SharedPages/ProfilePage";
import MenuPage from "@/pages/SharedPages/MenuPage";
import EditProfilePage from "@/pages/SharedPages/EditProfilePage";

import MainPetProfilePage from "@/pages/PetProfile/MainPetProfilePage";
import AddPetPage from "@/pages/PetProfile/AddPetPage";
import PetProfilePage from "@/pages/PetProfile/PetProfilePage";
import PetEditProfile from "@/pages/PetProfile/PetEditProfile";

const router = createBrowserRouter([
  // ... (Public Routes remain unchanged)
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
    path: "/reset-password",
    element: <UpdatePassword />,
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
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
        element: <UserHomePage />,
      },
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
        path: "/admin/events/create",
        element: (
          <ProtectedRoute requiredRole="admin">
            <CreateEvent />
          </ProtectedRoute>
        ),
      },
      // ✅ NEW EDIT ROUTE
      {
        path: "/admin/events/edit/:id",
        element: (
          <ProtectedRoute requiredRole="admin">
            <EditEvent />
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
      {
        path: "/PetDashboard",
        element: <MainPetProfilePage />,
      },
      {
        path: "/PetDashboard/new",
        element: <AddPetPage />,
      },
      {
        path: "/PetDashboard/:petId",
        element: <PetProfilePage />,
      },
      {
        path: "/PetDashboard/:petId/edit",
        element: <PetEditProfile />,
      },
    ],
  },

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
