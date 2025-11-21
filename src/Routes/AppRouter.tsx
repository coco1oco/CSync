import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AuthProvider } from "../context/authContext"

// Import your pages
import Welcome from "../pages/Authentication/Welcome"
import SignIn from "../pages/Authentication/SignIn"
import SignUp from "../pages/Authentication/SignUp"
import UserDashboard from "../pages/UsersD/UserDashboard"
import ProtectedRoute from "../Routes/ProtectedRoute" //Loadining
import AdminDashboard from "../pages/AdminD/AdminDashboard"
import ForgotPassword from "../pages/Authentication/ForgotPassword"


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
  {
    path: "/AdminDashboard",
    element: (
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/ForgotPassword",
    element: (
        <ForgotPassword />
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
