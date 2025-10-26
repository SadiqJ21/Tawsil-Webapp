import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ArrowLeft, ShoppingCart, Heart, Plus, Minus } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
}

interface ProductDetailProps {
  product: Product;
  accessToken: string;
  onBack: () => void;
}
// detailed view of a single product with add to cart and wishlist buttons
export function ProductDetail({ product, accessToken, onBack }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);

  const addToCart = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/cart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ productId: product.id, quantity })
        }
      );

      if (response.ok) {
        toast.success(`Added ${quantity} item(s) to cart`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.log(`Error adding to cart: ${error}`);
      toast.error('An error occurred');
    }
  };

  const addToWishlist = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/wishlist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ productId: product.id })
        }
      );

      if (response.ok) {
        toast.success('Added to wishlist');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add to wishlist');
      }
    } catch (error) {
      console.log(`Error adding to wishlist: ${error}`);
      toast.error('An error occurred');
    }
  };
  
  return (
    <div>
      {/* return back*/}
      <Button variant="outline" onClick={onBack} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Products
      </Button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
          {/* Left column: product image */}
          <div>
            <img
              src={product.image}
              alt={product.name}
              className="w-full rounded-lg"
            />
          </div>

          <div>
            {/* Category, product name, description */}
            <Badge className="mb-3">{product.category}</Badge>
            <h1 className="mb-4">{product.name}</h1>
            <p className="text-gray-600 mb-6">{product.description}</p>

            {/* price and availability */}
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-blue-600">${product.price.toFixed(2)}</span>
              <span className="text-gray-600">
                {product.stock > 0
                  ? `${product.stock} available`
                  : 'Out of stock'}
              </span>
            </div>

            {/* purchase controls when product stock */}
            {product.stock > 0 && (
              <>
                {/* quantity selector with min/max */}
                <div className="mb-6">
                  <label className="block text-gray-600 mb-2">Quantity</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.max(
                            1,
                            Math.min(product.stock, parseInt(e.target.value) || 1)
                          )
                        )
                      }
                      className="w-20 text-center"
                      min="1"
                      max={product.stock}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* buttons to add to cart and wishlist */}
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={addToCart}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button variant="outline" onClick={addToWishlist}>
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Product out of stock message */}
            {product.stock === 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
                This product is currently out of stock.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}