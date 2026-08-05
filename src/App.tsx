import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Demo from "./pages/Demo.tsx";
import Start from "./pages/Start.tsx";
import ProDemo from "./pages/ProDemo.tsx";
import ProSetup from "./pages/ProSetup.tsx";
import ProDashboard from "./pages/ProDashboard.tsx";
import MyPlans from "./pages/MyPlans.tsx";
import PlanView from "./pages/PlanView.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/start" element={<Start />} />
            <Route path="/my-plans" element={<MyPlans />} />
            <Route path="/plan/:tripId" element={<PlanView />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/pro" element={<ProDemo />} />
            <Route path="/pro/setup" element={<ProSetup />} />
            <Route path="/pro/dashboard" element={<ProDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
