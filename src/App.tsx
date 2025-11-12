import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import DeviceStatusPage from "./pages/DeviceStatusPage";
import DataSharingPage from "./pages/DataSharingPage";
import MovementDashboard from "./pages/MovementDashboard";
import NotFound from "./pages/NotFound";
import Tracking from "./pages/Tracking";
import DeviceTypesManagement from "./pages/admin/DeviceTypesManagement";
import DeviceTypeDataConfigs from "./pages/admin/DeviceTypeDataConfigs";
import UserManagement from "./pages/admin/UserManagement";
import FloorPlanManagement from "./pages/FloorPlanManagement";
import FloorPlanEditor from "./pages/FloorPlanEditor";
import Alerts from "./pages/Alerts";
import PlatformMetrics from "./pages/PlatformMetrics";
import Pricing from "./pages/Pricing";
import ILQAnalytics from "./pages/ILQAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/device-status" 
              element={
                <ProtectedRoute>
                  <DeviceStatusPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/data-sharing" 
              element={
                <ProtectedRoute>
                  <DataSharingPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/movement-dashboard" 
              element={
                <ProtectedRoute>
                  <MovementDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/alerts" 
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tracking" 
              element={
                <ProtectedRoute>
                  <Tracking />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/device-types" 
              element={
                <ProtectedRoute>
                  <DeviceTypesManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/device-types/:deviceTypeId/configs" 
              element={
                <ProtectedRoute>
                  <DeviceTypeDataConfigs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/user-management" 
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/floor-plan-management" 
              element={
                <ProtectedRoute>
                  <FloorPlanManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/floor-plan-editor/:elderlyPersonId/:floorPlanId" 
              element={
                <ProtectedRoute>
                  <FloorPlanEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/platform-metrics" 
              element={
                <ProtectedRoute>
                  <PlatformMetrics />
                </ProtectedRoute>
              } 
            />
            <Route path="/pricing" element={<Pricing />} />
            <Route 
              path="/ilq-analytics" 
              element={
                <ProtectedRoute>
                  <ILQAnalytics />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
