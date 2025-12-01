import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AuthProvider } from "../context/authContext"

// Import your pages
import Welcome from "../pages/Authentication/Welcome"
import SignIn from "../pages/Authentication/SignIn"
import SignUp from "../pages/Authentication/SignUp"
import { UserHomePage } from "../pages/UsersD/UserHomePage"
import { AdminHomePage } from "../pages/AdminD/AdminHomePage"
import ProfilePage from "../pages/SharedPages/ProfilePage"
import { ProtectedRoute } from "../Routes/ProtectedRoute"
import ForgotPassword from "../pages/Authentication/ForgotPassword"
import MenuPage from "@/pages/SharedPages/MenuPage"
import EditProfilePage from "../pages/SharedPages/EditProfilePage"
import Unauthorized from "../pages/Authentication/Unauthorized";

const router = createBrowserRouter([
  {
    path: "/",
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
    path: "/UserDashboard",
    element: (
      <ProtectedRoute requiredRole="user">
        <UserHomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/ProfilePage",
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
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
    path: "/ForgotPassword",
    element: (
        <ForgotPassword />
    ),
  },
  {
    path: "/Menu",
    element: (
      <ProtectedRoute>
        <MenuPage /> 
      </ProtectedRoute>
    ),
  },
   {
    path: "/ProfilePage/Edit",
    element: (
      <ProtectedRoute >
        <EditProfilePage /> 
      </ProtectedRoute>
    ),
  },
  {
    path: "/unauthorized",
    element: (
        <Unauthorized />
    ),
  },
])

export default function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
