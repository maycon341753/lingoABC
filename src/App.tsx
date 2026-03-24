import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Modules from "./pages/Modules.tsx";
import Lesson from "./pages/Lesson.tsx";
import Plans from "./pages/Plans.tsx";
import About from "./pages/About.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Referral from "./pages/Referral.tsx";
import Admin from "./pages/Admin.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";

import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/modulos" element={<Modules />} />
          <Route path="/licao" element={<Lesson />} />
          <Route path="/planos" element={<Plans />} />
          <Route path="/sobre" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/indicacao" element={<Referral />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
</AuthProvider>
);

export default App;
