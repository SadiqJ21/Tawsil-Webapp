import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  status: string;
  shippingAddress: any;
  createdAt: string; 
}

interface OrderManagementProps {
  accessToken: string;
}

export function OrderManagement({ accessToken }: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [accessToken]);

  // fetch all orders from database and normalize before display
  const fetchOrders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/orders`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      const normalized: Order[] = (data.orders || []).map((o: any) => ({
        id: o.id,
        userId: o.user_id,
        userEmail: o.user_email,
        items: Array.isArray(o.items)
          ? o.items
          : Array.isArray(o.order_items)
          ? o.order_items.map((it: any) => ({
              productId: it.product_id,
              name: it.name,
              price: Number(it.price),
              quantity: it.quantity,
            }))
          : [],
        total: Number(o.total),
        status: o.status,
        shippingAddress: o.shipping_address ?? null,
        createdAt: o.created_at, // ISO string
      }));

      normalized.sort((a, b) => {
        const ta = Date.parse(a.createdAt || '');
        const tb = Date.parse(b.createdAt || '');
        return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
      });

      setOrders(normalized);
    } catch (error) {
      console.log(`Error fetching orders: ${error}`);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // change order status and refresh order list
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        toast.success('Order status updated');
        fetchOrders();
      } else {
        toast.error('Failed to update order status');
      }
    } catch (error) {
      console.log(`Error updating order status: ${error}`);
      toast.error('An error occurred');
    }
  };

  // get different colors for each order state
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // display loading state while fetching orders
  if (loading) {
    return <div className="text-center py-12">Loading orders...</div>;
  }

  return (
<div>
      <h2 className="mb-6">Order Management</h2>

      {/* Orders list container */}
      <div className="space-y-4">
        {orders.map((order) => {
          const dateStr =
            !order.createdAt || isNaN(Date.parse(order.createdAt))
              ? '—'
              : new Date(order.createdAt).toLocaleDateString();

          // Order card
          return (
            <Card key={order.id} className="p-6">
              {/* Header: id, customer, date, status badge */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="mb-1">Order #{order.id.slice(-8)}</h3>
                  <p className="text-gray-600">Customer: {order.userEmail || '—'}</p>
                  <p className="text-gray-600">Date: {dateStr}</p>
                </div>
                <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
              </div>

              {/* Items list */}
              <div className="border-t border-b py-4 my-4">
                <h4 className="mb-3">Items</h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-gray-600">
                      <span>
                        {item.name} x {item.quantity}
                      </span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total price and status selecting */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-600">Total: </span>
                  <span className="text-blue-600">${order.total.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Update Status:</span>
                  <Select
                    value={order.status}
                    onValueChange={(value: string) => updateOrderStatus(order.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Order shipping address */}
              {order.shippingAddress && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="mb-2">Shipping Address</h4>
                  <p className="text-gray-600">
                    {order.shippingAddress.street}, {order.shippingAddress.city}{' '}
                    {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Display if no orders exist */}
      {orders.length === 0 && (
        <div className="text-center py-12 text-gray-500">No orders yet.</div>
      )}
    </div>
  );
}
