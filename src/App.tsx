import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Editor from "./pages/Editor"; // Add this import
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";
import Callback from "./pages/auth/Callback";
import { AuthProvider } from "./contexts/AuthContext";
import { ApiProvider } from "./contexts/ApiContext";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <ApiProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Navigate to="/landing" replace />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/editor/:projectId/:projectName?" element={<Editor />} /> {/* Enhanced: projectName in URL */}
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth/callback" element={<Callback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          {/* Auth state debug overlay (dev only) */}
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ApiProvider>
  </BrowserRouter>
);

export default App;
