
import { Link, useNavigate } from "react-router-dom"

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-8 relative">
      <div className="mr-35 mb-16 relative -top-30">
        <p className="text-lg text-gray-700">Welcome to</p>
        <h1 className="text-5xl font-extrabold text-black mt-1">
          PawPal
        </h1>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs top-40 relative text-center">
        <Link to='/SignUp'
          className="rounded-3xl py-2 bg-gray-400 hover:bg-gray-500 text-white text-lg"
        >
          Sign Up
        </Link>

        <Link to="/SignIn"
          className="rounded-3xl py-2 bg-gray-800 hover:bg-gray-900 text-white text-lg"
        >
          Sign In
        </Link>
      </div>
    </div>
  )
}