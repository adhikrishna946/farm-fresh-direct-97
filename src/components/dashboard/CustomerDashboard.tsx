import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Search, ShoppingCart, Package, Plus, Minus, ClipboardList, Clock } from 'lucide-react';
import FloatingCart from '@/components/cart/FloatingCart';

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  unit: string | null;
  image_url: string | null;
  stock_quantity: number | null;
  farmer_id: string;
  expiry_date: string | null;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  shipping_address: string | null;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
}

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ['vegetables', 'rice', 'fruits', 'dairy', 'other'];

  useEffect(() => {
    fetchProducts();
    fetchCart();
    fetchOrders();
  }, [profile]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Filter out expired products
      const now = new Date().toISOString().split('T')[0];
      const active = data.filter((p: any) => !p.expiry_date || p.expiry_date >= now);
      setProducts(active as Product[]);
    }
    setIsLoading(false);
  };

  const fetchCart = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        quantity,
        product:products(*)
      `)
      .eq('customer_id', profile.id);
    
    if (!error && data) {
      setCartItems(data as unknown as CartItem[]);
    }
  };

  const fetchOrders = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        shipping_address,
        created_at,
        order_items(id, product_name, quantity, price_at_purchase)
      `)
      .eq('customer_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setOrders(data as Order[]);
    }
  };

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find(i => i.product_id === productId);
    return item?.quantity || 0;
  };

  const addToCart = async (product: Product) => {
    if (!profile) {
      toast({
        variant: 'destructive',
        title: 'Please log in',
        description: 'You need to be logged in to add items to cart.',
      });
      return;
    }

    try {
      const existingItem = cartItems.find(i => i.product_id === product.id);
      
      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
        
        if (error) {
          toast({ variant: 'destructive', title: 'Error', description: error.message });
        } else {
          await fetchCart();
        }
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            customer_id: profile.id,
            product_id: product.id,
            quantity: 1,
          });
        
        if (error) {
          toast({ variant: 'destructive', title: 'Error', description: error.message });
        } else {
          await fetchCart();
          toast({
            title: 'Added to cart!',
            description: `${product.name} has been added to your cart.`,
          });
        }
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const updateCartQuantity = async (productId: string, change: number) => {
    const existingItem = cartItems.find(i => i.product_id === productId);
    if (!existingItem) return;

    const newQuantity = existingItem.quantity + change;

    if (newQuantity <= 0) {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', existingItem.id);
      
      if (!error) {
        fetchCart();
      }
    } else {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id);
      
      if (!error) {
        fetchCart();
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cartItems.reduce((sum, item) => 
    sum + (item.product?.price || 0) * item.quantity, 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Fresh Market</h1>
          <p className="text-muted-foreground">Farm-fresh produce delivered to you</p>
        </div>
        
        {cartItems.length > 0 && (
          <Card className="px-4 py-2">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{cartItems.length} items</p>
                <p className="text-xs text-muted-foreground">₹{cartTotal.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Tabs for Shop and Orders */}
      <Tabs defaultValue="shop" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            My Orders ({orders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-6">

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="capitalize whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted rounded-t-lg" />
              <CardContent className="pt-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Products will appear here soon'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const cartQty = getCartQuantity(product.id);
            
            return (
              <Card key={product.id} className="overflow-hidden group">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 capitalize">
                    {product.category}
                  </Badge>
                  {product.expiry_date && (() => {
                    const daysUntil = Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    if (daysUntil <= 3 && daysUntil >= 0) {
                      return (
                        <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Expiring Soon
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                <CardContent className="pt-4">
                  <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <p className="font-bold text-primary">
                      ₹{product.price}/{product.unit}
                    </p>
                    
                    {cartQty > 0 ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateCartQuantity(product.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {cartQty}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateCartQuantity(product.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        className="gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </TabsContent>

        {/* My Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                My Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                  <p className="text-muted-foreground">
                    Your orders will appear here after checkout
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-lg border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              order.status === 'completed' ? 'default' :
                              order.status === 'pending' ? 'secondary' :
                              'outline'
                            }
                            className="capitalize"
                          >
                            {order.status}
                          </Badge>
                          <p className="font-bold mt-1">₹{order.total_amount}</p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3 space-y-2">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.product_name} × {item.quantity}
                            </span>
                            <span>₹{(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {order.shipping_address && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs text-muted-foreground">Shipping to:</p>
                          <p className="text-sm">{order.shipping_address}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Floating Cart */}
      <FloatingCart cartItems={cartItems} onUpdateQuantity={updateCartQuantity} />
    </div>
  );
}
