import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from './utils/supabase/client';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserDashboard } from './components/user/UserDashboard';
import { ShoppingBag, Wrench } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { projectId } from './utils/supabase/info';

type AuthView = 'login' | 'register';
type Role = 'admin' | 'user' | null;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [userRole, setUserRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AuthView>('login');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      setUserRole(null);
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.log(`Error checking session: ${error.message}`);
      }
      if (session?.user) {
        setUser(session.user);
        setAccessToken(session.access_token);
        await fetchUserRole(session.access_token);
      } else {
        setUser(null);
        setAccessToken('');
        setUserRole(null);
      }
    } catch (err) {
      console.log(`Unexpected error checking session: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async (token: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user/role`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setUserRole((data.role as Role) || 'user');
    } catch (error) {
      console.log(`Error fetching user role: ${error}`);
      setUserRole('user');
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log(`Error during logout: ${error.message}`);
      }
      setUser(null);
      setAccessToken('');
      setUserRole(null);
      setView('login');
    } catch (err) {
      console.log(`Unexpected error during logout: ${err}`);
    }
  };

  if (loading || (user && accessToken && userRole === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <ShoppingBag className="w-12 h-12 text-blue-600 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && accessToken) {
    if (userRole === 'admin') {
      return (
        <>
          <AdminDashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
          <Toaster />
        </>
      );
    }
    if (userRole === 'user') {
      return (
        <>
          <UserDashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
          <Toaster />
        </>
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Toaster />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShoppingBag className="w-10 h-10 text-blue-600" />
            <h1>Tawsil</h1>
          </div>
          <p className="text-gray-600">Carefully curated, swiftly delivered.</p>
        </div>

        {view === 'login' ? (
          <LoginForm
            onSwitchToRegister={() => setView('register')}
            onLoginSuccess={checkSession}
          />
        ) : (
          <RegisterForm
            onSwitchToLogin={() => setView('login')}
            onRegisterSuccess={checkSession}
          />
        )}
      </div>
    </div>
  );
}
