import { User } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ShoppingBag, LogOut, ShoppingCart as CartIcon, Heart, Package, User as UserIcon } from 'lucide-react';
import { ProductCatalog } from './ProductCatalog';
import { ProductDetail } from './ProductDetail';
import { ShoppingCart } from './ShoppingCart';
import { Wishlist } from './Wishlist';
import { Orders } from './Orders';
import { ProfileManagement } from './ProfileManagement';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
}

interface UserDashboardProps {
  user: User;
  accessToken: string;
  onLogout: () => void;
}

type View = 'catalog' | 'product' | 'cart' | 'wishlist' | 'orders' | 'profile';

export function UserDashboard({ user, accessToken, onLogout }: UserDashboardProps) {
  // state to track views, defaults to catalog
  const [activeView, setActiveView] = useState<View>('catalog'); 
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchCartCount();
  }, [activeView]);

  // fetch cart count for badge display
  const fetchCartCount = async () => {
    try {
      const response = await fetch(
        `https://${window.location.hostname.includes('supabase') ? 'lwpsxwnrbgrnyoqsrjaw' : 'lwpsxwnrbgrnyoqsrjaw'}.supabase.co/functions/v1/server/cart`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      const count = (data.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0);
      setCartCount(count);
    } catch (error) {
      console.log(`Error fetching cart count: ${error}`);
    }
  };

  // handle viewing a specific products
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveView('product');
  };

  // handle returning to catalog from product detail
  const handleBackToCatalog = () => {
    setSelectedProduct(null);
    setActiveView('catalog');
  };

 return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setActiveView('catalog')}
            >
              <ShoppingBag className="w-8 h-8 text-blue-600" />
              <h1>Tawsil</h1>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant={activeView === 'orders' ? 'default' : 'outline'}
                onClick={() => setActiveView('orders')}
              >
                <Package className="w-4 h-4 mr-2" />
                Orders
              </Button>

              <Button
                variant={activeView === 'wishlist' ? 'default' : 'outline'}
                onClick={() => setActiveView('wishlist')}
              >
                <Heart className="w-4 h-4 mr-2" />
                Wishlist
              </Button>

              <div className="relative">
                <Button
                  variant={activeView === 'cart' ? 'default' : 'outline'}
                  onClick={() => setActiveView('cart')}
                >
                  <CartIcon className="w-4 h-4 mr-2" />
                  Cart
                  {cartCount > 0 && (
                    <Badge className="ml-2 bg-red-500">{cartCount}</Badge>
                  )}
                </Button>
              </div>

              <Button
                variant={activeView === 'profile' ? 'default' : 'outline'}
                onClick={() => setActiveView('profile')}
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Profile
              </Button>

              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to log out?
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
        </div>
      </header>

      {/* content router shows the current active view */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'catalog' && (
          <ProductCatalog
            accessToken={accessToken}
            onViewProduct={handleViewProduct}
          />
        )}

        {activeView === 'product' && selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            accessToken={accessToken}
            onBack={handleBackToCatalog}
          />
        )}

        {activeView === 'cart' && (
          <ShoppingCart accessToken={accessToken} />
        )}

        {activeView === 'wishlist' && (
          <Wishlist accessToken={accessToken} />
        )}

        {activeView === 'orders' && (
          <Orders accessToken={accessToken} />
        )}

        {activeView === 'profile' && (
          <ProfileManagement user={user} accessToken={accessToken} />
        )}
      </main>
    </div>
  );
}