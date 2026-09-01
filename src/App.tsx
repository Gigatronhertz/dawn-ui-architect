import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Demo from "./pages/Demo.tsx";
import TripType from "./pages/TripType.tsx";
import Start from "./pages/Start.tsx";
import Explore from "./pages/Explore.tsx";
import ProDemo from "./pages/ProDemo.tsx";
import ProSetup from "./pages/ProSetup.tsx";
import ProDashboard from "./pages/ProDashboard.tsx";
import ProTripBuilder from "./pages/ProTripBuilder.tsx";
import ProTripDetail from "./pages/ProTripDetail.tsx";
import MyPlans from "./pages/MyPlans.tsx";
import PlanView from "./pages/PlanView.tsx";
import Admin from "./pages/Admin.tsx";
import ProLogin from "./pages/ProLogin.tsx";
import Login from "./pages/Login.tsx";
import Pricing from "./pages/Pricing.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    storageKey="karije-theme"
    disableTransitionOnChange
  >
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/start" element={<TripType />} />
            <Route path="/start/trip" element={<Start />} />
            <Route path="/start/explore" element={<Explore />} />
            <Route path="/my-plans" element={<MyPlans />} />
            <Route path="/plan/:tripId" element={<PlanView />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/pro" element={<ProDemo />} />
            <Route path="/pro/login" element={<ProLogin />} />
            <Route path="/pro/setup" element={<ProSetup />} />
            <Route path="/pro/dashboard" element={<ProDashboard />} />
            <Route path="/pro/trips/new" element={<ProTripBuilder />} />
            <Route path="/pro/trips/:tripId" element={<ProTripDetail />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login"   element={<Login />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms"   element={<Terms />} />
            {/* /trips folded into Explore — curated trips are browsed by state.
                Kept as a redirect so existing links and shares don't 404. */}
            <Route path="/trips"   element={<Navigate to="/start/explore" replace />} />
            <Route path="/admin"   element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
