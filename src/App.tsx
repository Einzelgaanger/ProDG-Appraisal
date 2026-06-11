import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EmployeeAuthProvider, useEmployeeAuth } from "@/contexts/EmployeeAuthContext";
import Onboarding from "./pages/Onboarding";
import EmployeeLogin from "./pages/EmployeeLogin";
import FindAccount from "./pages/FindAccount";
import ResetPassword from "./pages/ResetPassword";
import Login from "./pages/Login";
import Unsubscribe from "./pages/Unsubscribe";
import DemoDashboard from "./pages/DemoDashboard";
import EmployeeHub from "./pages/EmployeeHub";
import DeveloperInfo from "./pages/DeveloperInfo";
import AppraisalAdmin from "./pages/AppraisalAdmin";
import NotFound from "./pages/NotFound";
import { AppBootstrapSkeleton, QuickBusyBar } from "./components/loading/ContentSkeletons";
import { useProgressiveBusy } from "./hooks/useProgressiveBusy";

const queryClient = new QueryClient();

function AuthLoadingShell() {
  const { isLoading } = useEmployeeAuth();
  const { showQuickPulse, showHeavySkeleton } = useProgressiveBusy(isLoading, {
    quickAfterMs: 80,
    heavyAfterMs: 320,
  });
  if (!isLoading) return null;
  return (
    <>
      {showQuickPulse && <QuickBusyBar />}
      {showHeavySkeleton ? (
        <AppBootstrapSkeleton />
      ) : (
        <div className="min-h-screen bg-background" aria-busy="true" />
      )}
    </>
  );
}

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: isLegacyAdmin } = useAuth();
  const { isAuthenticated: isEmployee, isAdmin, isLoading } = useEmployeeAuth();
  if (isLoading) return <AuthLoadingShell />;
  if (isLegacyAdmin || (isEmployee && isAdmin)) return <>{children}</>;
  return <Navigate to="/admin" replace />;
}

function ProtectedEmployeeRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useEmployeeAuth();
  if (isLoading) return <AuthLoadingShell />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Hub is for PMs (and admins acting as PM). Developers get results via email PDF. */
function ProtectedHubRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPM, isAdmin, isLoading } = useEmployeeAuth();
  if (isLoading) return <AuthLoadingShell />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isPM && !isAdmin) return <Navigate to="/developer-info" replace />;
  return <>{children}</>;
}

function AdminGate() {
  const { isAuthenticated: isLegacyAdmin } = useAuth();
  const { isAuthenticated: isEmployee, isAdmin, isLoading } = useEmployeeAuth();
  if (isLoading) return <AuthLoadingShell />;
  if (isLegacyAdmin || (isEmployee && isAdmin)) return <Navigate to="/appraisal" replace />;
  return <Login />;
}

function AppRoutes() {
  const { isAuthenticated: isEmployee, isLoading } = useEmployeeAuth();

  if (isLoading) {
    return <AuthLoadingShell />;
  }

  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/login" element={<EmployeeLogin />} />
      <Route path="/developer-info" element={<ProtectedEmployeeRoute><DeveloperInfo /></ProtectedEmployeeRoute>} />
      <Route path="/find-account" element={<FindAccount />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/hub" element={<ProtectedHubRoute><EmployeeHub /></ProtectedHubRoute>} />
      {/* Legacy routes redirect to hub */}
      <Route path="/survey" element={<Navigate to="/hub?tab=survey" replace />} />
      <Route path="/my-dashboard" element={<Navigate to="/hub?tab=dashboard" replace />} />
      <Route path="/wall-of-fame" element={<Navigate to="/hub?tab=rankings" replace />} />
      <Route path="/admin" element={<AdminGate />} />
      <Route path="/dashboard" element={<Navigate to="/appraisal" replace />} />
      <Route path="/appraisal" element={<ProtectedAdminRoute><AppraisalAdmin /></ProtectedAdminRoute>} />
      <Route path="/demo" element={<DemoDashboard />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EmployeeAuthProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </EmployeeAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
