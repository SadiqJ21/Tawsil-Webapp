import { User } from '@supabase/supabase-js';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ShoppingBag, LogOut, Package, FolderTree, ShoppingCart, BarChart3 } from 'lucide-react';
import { ProductManagement } from './ProductManagement';
import { CategoryManagement } from './CategoryManagement';
import { OrderManagement } from './OrderManagement';
import { Analytics } from './Analytics';

interface AdminDashboardProps {
  user: User;
  accessToken: string;
  onLogout: () => void;
}

export function AdminDashboard({ user, accessToken, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* top header*/}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-blue-600" />
              <div>
                <h1>Tawsil Admin</h1>
                <p className="text-gray-600">Admin Panel</p>
              </div>
            </div>

            {/* displays admin email*/}
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {user.email}
              </span>

              {/* display alert dialog to prevent accidental log outs */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to log out? Any unsaved changes will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onLogout}>
                      Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      {/*  main content area with tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>

          <TabsList className="mb-6">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>

            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>

            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              Categories
            </TabsTrigger>

            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          
          <TabsContent value="analytics">
            <Analytics accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="products">
            <ProductManagement accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagement accessToken={accessToken} />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManagement accessToken={accessToken} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
