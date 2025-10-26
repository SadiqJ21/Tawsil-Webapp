import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  items: OrderItem[];
  total: number;
  status: string;
  shippingAddress: any | null;
  createdAt: string | null; 
}

interface OrdersProps {
  accessToken: string;
}

function normalizeDate(input: unknown): string | null {
  if (input == null) return null;
  if (typeof input === 'number') {
    const ms = input < 3e12 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      const ms = num < 3e12 ? num * 1000 : num;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    const t = Date.parse(trimmed);
    if (!isNaN(t)) return new Date(t).toISOString();
  }

  return null;
}

function normalizeAddress(addr: any): any | null {
  if (!addr) return null;
  if (typeof addr === 'string') {
    try {
      const parsed = JSON.parse(addr);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return addr;
}
//lists current user's orders split into pending or completed
export function Orders({ accessToken }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/orders`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();

      const normalized: Order[] = (data.orders ?? []).map((o: any) => {
        const items: OrderItem[] = Array.isArray(o.items)
          ? o.items
          : Array.isArray(o.order_items)
          ? o.order_items.map((it: any) => ({
              productId: it.product_id,
              name: it.name,
              price: Number(it.price),
              quantity: Number(it.quantity),
            }))
          : [];

        const createdAt =
          normalizeDate(o.created_at) ??
          normalizeDate(o.createdAt) ??
          null;

        return {
          id: String(o.id),
          items,
          total: Number(o.total ?? 0),
          status: String(o.status ?? 'pending'),
          shippingAddress: normalizeAddress(o.shipping_address ?? o.shippingAddress ?? null),
          createdAt,
        };
      });

      setOrders(normalized);
    } catch (error) {
      console.log(`Error fetching orders: ${error}`);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
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
  //split orders into pending and completed
  const pendingOrders = orders.filter((o) =>
    ['pending', 'processing', 'shipped'].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ['delivered', 'cancelled'].includes(o.status)
  );

  if (loading) {
    return <div className="text-center py-12">Loading orders...</div>;
  }

  const OrderList = ({ orders }: { orders: Order[] }) => {
    if (orders.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No orders found.
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {orders.map((order) => {
          const dateLabel =
            order.createdAt && !isNaN(Date.parse(order.createdAt))
              ? new Date(order.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—';

        return (
          <Card key={order.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="mb-1">Order #{order.id.slice(-8)}</h3>
                <p className="text-gray-600">{dateLabel}</p>
              </div>
              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
            </div>

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

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total</span>
              <span className="text-blue-600">${order.total.toFixed(2)}</span>
            </div>

            {order.shippingAddress && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="mb-2">Shipping Address</h4>
                <p className="text-gray-600">
                  {order.shippingAddress.street}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.zipCode}
                </p>
              </div>
            )}
          </Card>
        )})}
      </div>
    );
  };
  
  //main return with tabs for pending and completed orders
  return (
    <div>
      <h2 className="mb-6">My Orders</h2>

      <Tabs defaultValue="pending">
        <TabsList className="mb-6">
          <TabsTrigger value="pending">
            Pending ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <OrderList orders={pendingOrders} />
        </TabsContent>

        <TabsContent value="completed">
          <OrderList orders={completedOrders} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
