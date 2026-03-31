import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ReferralTracker from "./components/ReferralTracker.tsx";
import AnalyticsTracker from "./components/AnalyticsTracker.tsx";
import RequireAuth from "./components/RequireAuth.tsx";

import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index.tsx"));
const Modules = lazy(() => import("./pages/Modules.tsx"));
const Lesson = lazy(() => import("./pages/Lesson.tsx"));
const Plans = lazy(() => import("./pages/Plans.tsx"));
const Videos = lazy(() => import("./pages/Videos.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Referral = lazy(() => import("./pages/Referral.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const UserPlans = lazy(() => import("./pages/UserPlans.tsx"));
const UserInvoices = lazy(() => import("./pages/UserInvoices.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.tsx"));
const Lgpd = lazy(() => import("./pages/Lgpd.tsx"));
const Eca = lazy(() => import("./pages/Eca.tsx"));
const DidacticBooks = lazy(() => import("./pages/DidacticBooks.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <ReferralTracker />
        <AnalyticsTracker />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-muted-foreground">Carregando…</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/planos" element={<Plans />} />
            <Route path="/plano-assinatura" element={<Navigate to="/planos" replace />} />
            <Route
              path="/modulos"
              element={
                <RequireAuth>
                  <Modules />
                </RequireAuth>
              }
            />
            <Route
              path="/modulos/:subject"
              element={
                <RequireAuth>
                  <Modules />
                </RequireAuth>
              }
            />
            <Route
              path="/modulos/:subject/:module"
              element={
                <RequireAuth>
                  <Modules />
                </RequireAuth>
              }
            />
            <Route
              path="/modulos/livros-didaticos"
              element={
                <RequireAuth>
                  <DidacticBooks />
                </RequireAuth>
              }
            />
            <Route path="/modulo-descoberta" element={<Navigate to="/modulos/matematica/descoberta" replace />} />
            <Route path="/modulo-construcao" element={<Navigate to="/modulos/matematica/construcao" replace />} />
            <Route path="/modulo-desenvolvimento" element={<Navigate to="/modulos/matematica/desenvolvimento" replace />} />
            <Route path="/modulo-dominio" element={<Navigate to="/modulos/matematica/dominio" replace />} />
            <Route path="/licao" element={<Lesson />} />
            <Route
              path="/videos"
              element={
                <RequireAuth>
                  <Videos />
                </RequireAuth>
              }
            />
            <Route path="/sobre" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/usuario/planos" element={<UserPlans />} />
            <Route path="/usuario/faturas" element={<UserInvoices />} />
            <Route
              path="/usuario/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route path="/dashboard" element={<Navigate to="/usuario/dashboard" replace />} />
            <Route path="/indicacao" element={<Referral />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/lgpd" element={<Lgpd />} />
            <Route path="/eca" element={<Eca />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
</AuthProvider>
);

export default App;
