import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AuthProvider } from "../context/authContext"
import { useAuth } from "@/context/authContext";
import { Navigate } from "react-router-dom";

// Import your pages
import Welcome from "../pages/Authentication/Welcome"
import SignIn from "../pages/Authentication/SignIn"
import SignUp from "../pages/Authentication/SignUp"
import UserDashboard from "../pages/UsersD/UserDashboard"
import ProtectedRoute from "../Routes/ProtectedRoute"

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
      <ProtectedRoute>
        <UserDashboard />
      </ProtectedRoute>
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
