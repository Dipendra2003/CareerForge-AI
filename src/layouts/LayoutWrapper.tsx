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
  const { user } = useAuth();
  
  // If user is admin, use AdminLayout for all pages
  if (user?.role === 'admin' || currentUser?.role === 'admin') {
    return <AdminLayout>{children}</AdminLayout>;
  }
  
  // Otherwise use regular Layout
  return (
    <Layout currentUser={currentUser} appIsSyncing={appIsSyncing}>
      {children}
    </Layout>
  );
}
