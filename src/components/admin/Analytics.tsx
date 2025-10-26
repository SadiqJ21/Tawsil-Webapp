import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, Package, Users, TrendingUp, AlertTriangle, Loader2, Activity } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface AnalyticsProps {
  accessToken: string;
}

interface Statistics {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  totalCategories: number;
  totalUsers: number;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
}

interface Order {
  id: string;
  userEmail: string;
  total: number;
  status: string;
  createdAt: string;
  items: any[];
}

interface RevenueData {
  date: string;
  revenue: number;
}

interface Log {
  id: string;
  type: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  orderId?: string;
  totalAmount?: number;
  itemCount?: number;
  previousStatus?: string;
  newStatus?: string;
}

export function Analytics({ accessToken }: AnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [revenueChart, setRevenueChart] = useState<RevenueData[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [accessToken]);

  // fetch all analytics data from backend
  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/analytics`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();

      if (!response.ok) {
        toast.error('Failed to load analytics');
        setLoading(false);
        return;
      }

      setStatistics(data.statistics ?? null);
      setLowStockProducts((data.lowStockProducts ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        stock: Number(p.stock),
        price: Number(p.price),
      })));

      // normalize the orders data before displaying
      const normalizedRecent: Order[] = (data.recentOrders ?? []).map((o: any) => ({
        id: o.id,
        userEmail: o.user_email ?? o.userEmail ?? '',
        total: Number(o.total),
        status: o.status,
        createdAt: o.created_at ?? o.createdAt ?? '',
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
      }));
      setRecentOrders(normalizedRecent); 

      // set revenue charts data
      setRevenueChart((data.revenueChart ?? []).map((r: any) => ({
        date: r.date,
        revenue: Number(r.revenue),
      })));

    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // fetch activity logs from backend
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/admin/logs`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error('Failed to load logs');
        setLogsLoading(false);
        return;
      }
      setLogs(data.logs || []);
    } catch (error) {
      toast.error('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  };

  //formatting the date for table display
  const formatDate = (dateString: string) => {
    const d = Date.parse(dateString || '');
    if (isNaN(d)) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // format for date label on the chart
  const formatChartDate = (dateString: string) => {
    const d = Date.parse(dateString || '');
    if (isNaN(d)) return '';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // display readable messages for created and updated logs
  const getLogMessage = (log: Log) => {
    switch (log.type) {
      case 'order_created':
        return `Order #${log.orderId?.slice(-8)} created - $${log.totalAmount?.toFixed(2)} (${log.itemCount} items)`;
      case 'order_status_updated':
        return `Order #${log.orderId?.slice(-8)} status changed from ${log.previousStatus} to ${log.newStatus}`;
      default:
        return `Unknown activity: ${log.type}`;
    }
  };

  // get icon based on log type
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'order_created':
        return <ShoppingCart className="w-4 h-4 text-green-600" />;
      case 'order_status_updated':
        return <Activity className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // initial loading state
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6">Analytics & Statistics</h2>

      
      {/* Display data cards for total revenue, orders, products and users */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-green-600">${Number(statistics?.totalRevenue ?? 0).toFixed(2)}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Orders</span>
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-blue-600">{statistics?.totalOrders ?? 0}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {(statistics?.pendingOrders ?? 0)} Pending
            </Badge>
            <Badge variant="outline" className="text-xs">
              {(statistics?.completedOrders ?? 0)} Completed
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Products</span>
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-purple-600">{statistics?.totalProducts ?? 0}</p>
          <p className="text-gray-500">{statistics?.totalCategories ?? 0} Categories</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Users</span>
            <Users className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-orange-600">{statistics?.totalUsers ?? 0}</p>
        </Card>
      </div>

      
      {/* display tabs for overview, inventory, and logs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="logs" onClick={() => !logs.length && fetchLogs()}>
            Activity Logs
          </TabsTrigger>
        </TabsList>
        
      {/*overview tab: includes revenue bar chart and recent order list*/}
        <TabsContent value="overview" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Revenue (Last 7 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatChartDate} />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `$${Number(value).toFixed(2)}`}
                  labelFormatter={formatChartDate}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4">Recent Orders</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>#{order.id.slice(-8)}</TableCell>
                      <TableCell>{order.userEmail || '—'}</TableCell>
                      <TableCell>{order.items?.length ?? 0}</TableCell>
                      <TableCell>${Number(order.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === 'completed'
                              ? 'default'
                              : order.status === 'cancelled'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

      {/*Inventory: includes a list for products that are low on stock*/}
        <TabsContent value="inventory">
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Low Stock Products (Below 10 Units)
            </h3>
            {lowStockProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">All products have sufficient stock</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>
                          <span className={product.stock === 0 ? 'text-red-600' : 'text-orange-600'}>
                            {product.stock} units
                          </span>
                        </TableCell>
                        <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={product.stock === 0 ? 'destructive' : 'outline'}>
                            {product.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
        
        
      {/*logs tab: includes logging for recent user activities*/}
        <TabsContent value="logs">
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Logs (Last 100)
            </h3>
            {logsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No activity logs yet</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="mt-1">{getLogIcon(log.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 break-words">{getLogMessage(log)}</p>
                      <p className="text-gray-500 mt-1">
                        {log.userEmail} • {formatDate(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
