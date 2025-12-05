import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthLayout() {
  const location = useLocation();

  return (
    // ✅ Added fixed container with overflow-hidden to prevent scrollbars
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full h-full"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
