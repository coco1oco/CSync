
// Component function - reusable header
export function SeconHeader({
}: Readonly<HeaderProps>): JSX.Element {
  const navigate = useNavigate();

  return (
     
 <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4">
            <
            type="button"
            onClick={() => navigate(-1)} // go to previous page in history
            className="h-8 w-8 rounded flex items-center justify-center"
            >
            <img src={BackIcon} alt="Back" className="h-6 w-6" />
            </button>
           <button
            // Navigate to profile page when clicked
            onClick={() => navigate('/MenuPage')}
                  // Hover effect: light background on hover
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
                {/* Menu SVG icon */}
            <img src={MenuIcon} alt="Menu" className="h-6 w-6" />
            </button>
      </header>
}

 
 
 <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4">
            <button
            type="button"
            onClick={() => navigate(-1)} // go to previous page in history
            className="h-8 w-8 rounded flex items-center justify-center"
            >
            <img src={BackIcon} alt="Back" className="h-6 w-6" />
            </button>
           <button
            // Navigate to profile page when clicked
            onClick={() => navigate('/MenuPage')}
                  // Hover effect: light background on hover
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
                {/* Menu SVG icon */}
            <img src={MenuIcon} alt="Menu" className="h-6 w-6" />
            </button>
      </header>