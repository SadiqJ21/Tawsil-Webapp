import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Heart, ShoppingCart, Trash2, Loader2 } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface WishlistItem {
  productId: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    stock: number;
  };
}

interface WishlistProps {
  accessToken: string;
}
// user's wishlist view with ability to remove items or add to cart
export function Wishlist({ accessToken }: WishlistProps) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, []);

  //fetch wishlist items from backend
  const fetchWishlist = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/wishlist`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      setWishlistItems(data.items || []);
    } catch (error) {
      console.log(`Error fetching wishlist: ${error}`);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  /** remove a product from wishlist, then refresh list */
  const removeItem = async (productId: string) => {
    setRemovingItem(productId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/wishlist/${productId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (response.ok) {
        toast.success('Removed from wishlist');
        fetchWishlist();
      } else {
        toast.error('Failed to remove item');
      }
    } catch (error) {
      console.log(`Error removing item: ${error}`);
      toast.error('An error occurred');
    } finally {
      setRemovingItem(null);
    }
  };

  /** add a wishlisted product to cart */
  const addToCart = async (productId: string) => {
    setAddingToCart(productId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/cart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ productId, quantity: 1 }),
        }
      );
      if (response.ok) {
        toast.success('Added to cart');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.log(`Error adding to cart: ${error}`);
      toast.error('An error occurred');
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  /** page empty state */
  if (wishlistItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="mb-2">Your wishlist is empty</h3>
        <p className="text-gray-600">Save products you love for later!</p>
      </div>
    );
  }

  /** grid of wishlist product cards with actions */
  return (
    <div>
      <h2 className="mb-6">My Wishlist</h2>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlistItems.map((item) => (
          <Card key={item.productId} className="overflow-hidden">
            {/* Product image */}
            <img
              src={item.product.image}
              alt={item.product.name}
              className="w-full h-48 object-cover"
            />

            {/* product info + actions */}
            <div className="p-4">
              <h3 className="mb-2">{item.product.name}</h3>
              <p className="text-gray-600 line-clamp-2 mb-3">
                {item.product.description}
              </p>

              {/* price and stock */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-blue-600">
                  ${item.product.price.toFixed(2)}
                </span>
                <span className="text-gray-600">
                  {item.product.stock > 0 ? 'In stock' : 'Out of stock'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => addToCart(item.productId)}
                  disabled={
                    item.product.stock === 0 ||
                    addingToCart === item.productId ||
                    removingItem === item.productId
                  }
                >
                  {addingToCart === item.productId ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => removeItem(item.productId)}
                  disabled={
                    removingItem === item.productId || addingToCart === item.productId
                  }
                >
                  {removingItem === item.productId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
