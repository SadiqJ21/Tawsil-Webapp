import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { Trash2, Plus, Minus, ShoppingBag, Loader2 } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface CartItem {
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    stock: number;
  };
}

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface ShoppingCartProps {
  accessToken: string;
}

export function ShoppingCart({ accessToken }: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: ''
  });

  useEffect(() => {
    fetchCart();
    fetchAddresses();
  }, []);

  // fetch current cart items from backend
  const fetchCart = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/cart`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      setCartItems(data.items || []);
    } catch (error) {
      console.log(`Error fetching cart: ${error}`);
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  // fetch saved addresses for user
  const fetchAddresses = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user/addresses`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      setSavedAddresses(data.addresses || []);
      if (data.addresses?.length > 0) {
        setSelectedAddressId(data.addresses[0].id);
      } else {
        setUseNewAddress(true);
      }
    } catch (error) {
      console.log(`Error fetching addresses: ${error}`);
    }
  };

  // update quantity of a cart itemss
  const updateQuantity = async (productId: string, quantity: number) => {
    setUpdatingItem(productId);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/cart/${productId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ quantity })
        }
      );

      if (response.ok) {
        fetchCart();
      } else {
        toast.error('Failed to update quantity');
      }
    } catch (error) {
      console.log(`Error updating quantity: ${error}`);
      toast.error('An error occurred');
    } finally {
      setUpdatingItem(null);
    }
  };

  // remove item from cart
  const removeItem = async (productId: string) => {
    setRemovingItem(productId);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/cart/${productId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        toast.success('Item removed from cart');
        fetchCart();
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

  // handle checkout form submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacingOrder(true);

    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity
    }));

    let addressToUse = shippingAddress;
    
    if (!useNewAddress && selectedAddressId) {
      const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);
      if (selectedAddress) {
        addressToUse = {
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          zipCode: selectedAddress.postal_code
        };
      }
    }

 try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            items: orderItems,
            total: calculateTotal(),
            shippingAddress: addressToUse
          })
        }
      );

      if (response.ok) {
        toast.success('Order placed successfully!');
        setCheckoutOpen(false);
        fetchCart();
        setShippingAddress({ street: '', city: '', state: '', zipCode: '' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to place order');
      }
    } catch (error) {
      console.log(`Error placing order: ${error}`);
      toast.error('An error occurred');
    } finally {
      setPlacingOrder(false);
    }
  };

  // calculates cart total
  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // empty state for page when cart is empty
  if (cartItems.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="mb-2">Your cart is empty</h3>
        <p className="text-gray-600">Add some products to get started!</p>
      </div>
    );
  }


  return (
    <div>
      <h2 className="mb-6">Shopping Cart</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* cart tems list: thumbnail, price, quantity, line total, remove */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <Card key={item.productId} className="p-4">
              <div className="flex gap-4">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="mb-2">{item.product.name}</h3>
                  <p className="text-blue-600 mb-3">
                    ${item.product.price.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                      disabled={updatingItem === item.productId || removingItem === item.productId}
                    >
                      {updatingItem === item.productId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                    </Button>
                    <span className="w-12 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.productId, Math.min(item.product.stock, item.quantity + 1))}
                      disabled={updatingItem === item.productId || removingItem === item.productId}
                    >
                      {updatingItem === item.productId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <span className="text-gray-600">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(item.productId)}
                    disabled={updatingItem === item.productId || removingItem === item.productId}
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

        {/* order summary items */}
        <div>
          <Card className="p-6 sticky top-6">
            <h3 className="mb-4">Order Summary</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span>Total</span>
                <span className="text-blue-600">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            <Button className="w-full" onClick={() => setCheckoutOpen(true)}>
              Proceed to Checkout
            </Button>
          </Card>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Complete your order by providing shipping information
            </DialogDescription>
          </DialogHeader>

          {/* checkout form includes new and radiogroup for saved address*/}
          <form onSubmit={handleCheckout} className="space-y-4">
            {savedAddresses.length > 0 && (
              <>
                <div className="space-y-4">
                  <Label>Select Shipping Address</Label>
                  <RadioGroup
                    value={useNewAddress ? 'new' : selectedAddressId}
                    onValueChange={(value:string) => {
                      if (value === 'new') {
                        setUseNewAddress(true);
                      } else {
                        setUseNewAddress(false);
                        setSelectedAddressId(value);
                      }
                    }}
                    className="space-y-3"
                  >
                    {savedAddresses.map((address) => (
                      <div
                        key={address.id}
                        className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        <RadioGroupItem value={address.id} id={address.id} disabled={placingOrder} className="mt-1" />
                        <Label htmlFor={address.id} className="flex-1 cursor-pointer block">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{address.name}</span>
                            {address.is_default && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 leading-relaxed">
                            {address.street}, {address.city}, {address.state} {address.postal_code}
                          </p>
                        </Label>
                      </div>
                    ))}
                    <div className="grid grid-cols-[auto,1fr] items-start gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <RadioGroupItem value="new" id="new" disabled={placingOrder} className="mt-1" />
                      <Label htmlFor="new" className="cursor-pointer block font-medium">
                        Use a new address
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {useNewAddress && <Separator />}
              </>
            )}

            {/* fields for new address */}
            {(useNewAddress || savedAddresses.length === 0) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={shippingAddress.street}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, street: e.target.value })
                    }
                    required
                    disabled={placingOrder}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, city: e.target.value })
                      }
                      required
                      disabled={placingOrder}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={shippingAddress.state}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, state: e.target.value })
                      }
                      required
                      disabled={placingOrder}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={shippingAddress.zipCode}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, zipCode: e.target.value })
                    }
                    required
                    disabled={placingOrder}
                  />
                </div>
              </>
            )}

            {/* footer includes checkout button and total price */}
            <div className="border-t pt-4">
              <div className="flex justify-between mb-4">
                <span>Total</span>
                <span className="text-blue-600">${calculateTotal().toFixed(2)}</span>
              </div>
              <Button type="submit" className="w-full" disabled={placingOrder}>
                {placingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  'Place Order'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
