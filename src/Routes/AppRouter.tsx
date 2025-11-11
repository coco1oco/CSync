import { createBrowserRouter, RouterProvider} from "react-router-dom"

// Import your pages
import Welcome from "../pages/Authentication/Welcome"
import SignIn from "../pages/Authentication/SignIn"
import SignUp from "../pages/Authentication/SignUp"
import UserDashboard from "../pages/UsersD/UserDashboard"

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
    element: <UserDashboard />,
  },

])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
