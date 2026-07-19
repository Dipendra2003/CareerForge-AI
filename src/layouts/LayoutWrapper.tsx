import { useAuth } from "../contexts/AuthContext";
import Layout from "./Layout";
import AdminLayout from "./AdminLayout";
import { User } from "../types";

interface LayoutWrapperProps {
  children: React.ReactNode;
  currentUser: User | null;
  appIsSyncing: boolean;
}

export default function LayoutWrapper({ children, currentUser, appIsSyncing }: LayoutWrapperProps) {
  // Use regular Layout for all standard routes.
  // The AdminRoute component and App.tsx router setup already handle wrapping /admin routes in AdminLayout.
  return (
    <Layout currentUser={currentUser} appIsSyncing={appIsSyncing}>
      {children}
    </Layout>
  );
}
