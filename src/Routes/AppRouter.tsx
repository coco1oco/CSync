import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AuthProvider } from "../context/authContext"

// Import your pages
import Welcome from "../pages/Authentication/Welcome"
import SignIn from "../pages/Authentication/SignIn"
import SignUp from "../pages/Authentication/SignUp"
import { UserHomePage } from "../pages/UsersD/UserHomePage"
import { AdminHomePage } from "../pages/AdminD/AdminHomePage"
import ProfilePage from "../pages/SharedPages/ProfilePage"
import ProtectedRoute from "../Routes/ProtectedRoute" //Loadining
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
      <ProtectedRoute>
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
])

export default function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
