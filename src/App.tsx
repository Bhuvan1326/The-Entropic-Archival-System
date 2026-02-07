import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SimulationProvider } from "@/contexts/SimulationContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { AuthForm } from "@/components/auth/AuthForm";
import Dashboard from "./pages/Dashboard";
import IngestData from "./pages/IngestData";
import ArchiveExplorer from "./pages/ArchiveExplorer";
import QueryArchive from "./pages/QueryArchive";
import BaselinesCompare from "./pages/BaselinesCompare";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <AuthForm />;
  }
  
  return (
    <AlertProvider>
      <SimulationProvider>{children}</SimulationProvider>
    </AlertProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/ingest" element={<ProtectedRoute><IngestData /></ProtectedRoute>} />
            <Route path="/explorer" element={<ProtectedRoute><ArchiveExplorer /></ProtectedRoute>} />
            <Route path="/query" element={<ProtectedRoute><QueryArchive /></ProtectedRoute>} />
            <Route path="/baselines" element={<ProtectedRoute><BaselinesCompare /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
