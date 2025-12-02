import AppRouter from "./Routes/AppRouter"
import InstallPWA from "./components/installPWA";

export default function App() {
  return (
    <>
      <InstallPWA />
      <AppRouter />
    </>
  );
}

