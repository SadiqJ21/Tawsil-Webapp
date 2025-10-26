BACKEND CODE USED IN SUPABASE EDGE FUNCTION.

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
const app = new Hono();
app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: [
    "Content-Type",
    "Authorization"
  ],
  allowMethods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS"
  ],
  exposeHeaders: [
    "Content-Length"
  ],
  maxAge: 600
}));
const getSupabaseClient = ()=>{
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
};
const verifyUser = async (request)=>{
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};
const getOrCreateUserRecord = async (supabase, userId, email)=>{
  const { data: existingUser } = await supabase.from('users').select('*').eq('id', userId).single();
  if (existingUser) return existingUser;
  const role = email?.toLowerCase() === "admin@tawsil.com" ? "admin" : "user";
  const { data: newUser, error } = await supabase.from('users').insert({
    id: userId,
    email,
    role
  }).select().single();
  if (error) throw error;
  return newUser;
};
app.post("/server/signup", async (c)=>{
  const { email, password, name } = await c.req.json();
  const supabase = getSupabaseClient();
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (authError) {
      console.error('Auth creation error:', authError);
      if (authError.message.includes('already registered')) {
        return c.json({
          error: 'Email already registered'
        }, 400);
      }
      return c.json({
        error: 'Failed to create auth user: ' + authError.message
      }, 400);
    }
    const { data: userData, error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      role: 'user',
      name
    }).select().single();
    if (userError) {
      console.error('User record creation error:', userError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      if (userError.message.includes('relation') || userError.message.includes('does not exist')) {
        return c.json({
          error: 'Database not initialized. Please run schema.sql in your Supabase SQL Editor first.'
        }, 500);
      }
      return c.json({
        error: userError.message
      }, 400);
    }
    return c.json({
      success: true,
      user: userData
    }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({
      error: error.message || 'An unexpected error occurred during registration'
    }, 500);
  }
});
app.post("/server/create-admin", async (c)=>{
  const { email, password, name } = await c.req.json();
  const supabase = getSupabaseClient();
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (authError) {
      if (authError.message.includes('already registered')) {
        return c.json({
          error: 'User already exists'
        }, 400);
      }
      throw authError;
    }
    const { data: userData, error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      role: 'admin',
      name
    }).select().single();
    if (userError) {
      return c.json({
        error: userError.message
      }, 400);
    }
    return c.json({
      success: true,
      user: userData
    }, 201);
  } catch (error) {
    return c.json({
      error: error.message
    }, 400);
  }
});
app.get("/server/user", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  return c.json({
    user: userData
  });
});
app.get("/server/user/role", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) return c.json({
    error: "Unauthorized"
  }, 401);
  const supabase = getSupabaseClient();
  const { data: row } = await supabase.from("users").select("role").eq("id", user.id).single();
  const { data: adminUser } = await supabase.auth.admin.getUserById(user.id);
  const appMeta = adminUser?.user?.app_metadata ?? {};
  const roles = Array.isArray(appMeta.roles) ? appMeta.roles : [];
  const hasAdminClaim = roles.includes("admin") || appMeta.role === "admin";
  const isAdmin = row?.role === "admin" || hasAdminClaim;
  return c.json({
    role: isAdmin ? "admin" : "user"
  });
});
app.put("/server/user/profile", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const { name, phone } = await c.req.json();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('users').update({
    name,
    phone
  }).eq('id', user.id).select().single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    user: data
  });
});
app.get("/server/user/addresses", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', {
    ascending: false
  }).order('created_at', {
    ascending: false
  });
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    addresses: data || []
  });
});
app.get("/server/addresses", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', {
    ascending: false
  }).order('created_at', {
    ascending: false
  });
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    addresses: data || []
  });
});
app.post("/server/addresses", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const addressData = await c.req.json();
  const supabase = getSupabaseClient();
  if (addressData.is_default) {
    await supabase.from('addresses').update({
      is_default: false
    }).eq('user_id', user.id);
  }
  const { data, error } = await supabase.from('addresses').insert({
    ...addressData,
    user_id: user.id
  }).select().single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    address: data
  }, 201);
});
app.put("/server/addresses/:id", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const addressId = c.req.param('id');
  const addressData = await c.req.json();
  const supabase = getSupabaseClient();
  if (addressData.is_default) {
    await supabase.from('addresses').update({
      is_default: false
    }).eq('user_id', user.id).neq('id', addressId);
  }
  const { data, error } = await supabase.from('addresses').update(addressData).eq('id', addressId).eq('user_id', user.id).select().single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    address: data
  });
});
app.delete("/server/addresses/:id", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const addressId = c.req.param('id');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('addresses').delete().eq('id', addressId).eq('user_id', user.id);
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    success: true
  });
});
app.get("/server/categories", async (c)=>{
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    categories: data || []
  });
});
app.post("/server/categories", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const { name, description } = await c.req.json();
  const { data, error } = await supabase.from('categories').insert({
    name,
    description
  }).select().single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    category: data
  }, 201);
});
app.put("/server/categories/:id", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const categoryId = c.req.param('id');
  const updates = await c.req.json();
  const { data, error } = await supabase.from('categories').update(updates).eq('id', categoryId).select().single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    category: data
  });
});
app.delete("/server/categories/:id", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const categoryId = c.req.param('id');
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    success: true
  });
});
app.get("/server/products", async (c)=>{
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('products').select(`
      *,
      category:categories(id, name)
    `).order('created_at', {
    ascending: false
  });
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  const products = (data || []).map((p)=>({
      ...p,
      category: p.category?.name || 'Uncategorized'
    }));
  return c.json({
    products
  });
});
app.get("/server/products/:id", async (c)=>{
  const productId = c.req.param('id');
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('products').select(`
      *,
      category:categories(id, name)
    `).eq('id', productId).single();
  if (error) {
    return c.json({
      error: 'Product not found'
    }, 404);
  }
  const product = {
    ...data,
    category: data.category?.name || 'Uncategorized'
  };
  return c.json({
    product
  });
});
app.post("/server/products", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const { name, description, price, category, image, stock } = await c.req.json();
  const { data: categoryData } = await supabase.from('categories').select('id').eq('name', category).single();
  const { data, error } = await supabase.from('products').insert({
    name,
    description,
    price: parseFloat(price),
    category_id: categoryData?.id || null,
    image,
    stock: parseInt(stock),
    created_by: user.id
  }).select(`
      *,
      category:categories(id, name)
    `).single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  const product = {
    ...data,
    category: data.category?.name || 'Uncategorized'
  };
  return c.json({
    product
  }, 201);
});
app.put("/server/products/:id", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const productId = c.req.param('id');
  const updates = await c.req.json();
  if (updates.category) {
    const { data: categoryData } = await supabase.from('categories').select('id').eq('name', updates.category).single();
    updates.category_id = categoryData?.id || null;
    delete updates.category;
  }
  if (updates.price) updates.price = parseFloat(updates.price);
  if (updates.stock) updates.stock = parseInt(updates.stock);
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('products').update(updates).eq('id', productId).select(`
      *,
      category:categories(id, name)
    `).single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  const product = {
    ...data,
    category: data.category?.name || 'Uncategorized'
  };
  return c.json({
    product
  });
});
app.delete("/server/products/:id", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const productId = c.req.param('id');
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    success: true
  });
});
app.get("/server/cart", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('cart_items').select(`
      id,
      quantity,
      product:products(*)
    `).eq('user_id', user.id);
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  const items = (data || []).map((item)=>({
      productId: item.product.id,
      product: item.product,
      quantity: item.quantity
    }));
  return c.json({
    items
  });
});
app.post("/server/cart", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const { productId, quantity } = await c.req.json();
  const supabase = getSupabaseClient();
  const { data: existingItem } = await supabase.from('cart_items').select('*').eq('user_id', user.id).eq('product_id', productId).single();
  if (existingItem) {
    const { data, error } = await supabase.from('cart_items').update({
      quantity: existingItem.quantity + parseInt(quantity)
    }).eq('id', existingItem.id).select(`
        id,
        quantity,
        product:products(*)
      `).single();
    if (error) {
      return c.json({
        error: error.message
      }, 400);
    }
    return c.json({
      item: {
        productId: data.product.id,
        product: data.product,
        quantity: data.quantity
      }
    });
  }
  const { data, error } = await supabase.from('cart_items').insert({
    user_id: user.id,
    product_id: productId,
    quantity: parseInt(quantity)
  }).select(`
      id,
      quantity,
      product:products(*)
    `).single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    item: {
      productId: data.product.id,
      product: data.product,
      quantity: data.quantity
    }
  }, 201);
});
app.put("/server/cart/:productId", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const productId = c.req.param('productId');
  const { quantity } = await c.req.json();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('cart_items').update({
    quantity: parseInt(quantity)
  }).eq('user_id', user.id).eq('product_id', productId).select(`
      id,
      quantity,
      product:products(*)
    `).single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    item: {
      productId: data.product.id,
      product: data.product,
      quantity: data.quantity
    }
  });
});
app.delete("/server/cart/:productId", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const productId = c.req.param('productId');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id).eq('product_id', productId);
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    success: true
  });
});
app.get("/server/wishlist", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('wishlist_items').select(`
      id,
      created_at,
      product:products(*)
    `).eq('user_id', user.id).order('created_at', {
    ascending: false
  });
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  const items = (data || []).map((item)=>({
      productId: item.product.id,
      product: item.product,
      addedAt: item.created_at
    }));
  return c.json({
    items
  });
});
app.post("/server/wishlist", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const { productId } = await c.req.json();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('wishlist_items').insert({
    user_id: user.id,
    product_id: productId
  }).select(`
      id,
      created_at,
      product:products(*)
    `).single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    item: {
      productId: data.product.id,
      product: data.product,
      addedAt: data.created_at
    }
  }, 201);
});
app.delete("/server/wishlist/:productId", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const productId = c.req.param('productId');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('wishlist_items').delete().eq('user_id', user.id).eq('product_id', productId);
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  return c.json({
    success: true
  });
});
app.get("/server/orders", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('orders').select(`
      *,
      order_items:order_items(*)
    `).eq('user_id', user.id).order('created_at', {
    ascending: false
  });
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  const orders = (data || []).map((order)=>({
      ...order,
      items: order.order_items.map((item)=>({
          productId: item.product_id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity
        }))
    }));
  return c.json({
    orders
  });
});
app.get("/server/admin/orders", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const { data, error } = await supabase.from('orders').select(`
      *,
      order_items:order_items(*)
    `).order('created_at', {
    ascending: false
  });
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  const orders = (data || []).map((order)=>({
      ...order,
      items: order.order_items.map((item)=>({
          productId: item.product_id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity
        }))
    }));
  return c.json({
    orders
  });
});
app.post("/server/orders", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const { items, total, shippingAddress } = await c.req.json();
  const supabase = getSupabaseClient();
  for (const item of items){
    const { data: product } = await supabase.from('products').select('stock').eq('id', item.productId).single();
    if (!product) {
      return c.json({
        error: `Product ${item.name} not found`
      }, 404);
    }
    if (product.stock < item.quantity) {
      return c.json({
        error: `Insufficient stock for ${item.name}`
      }, 400);
    }
    const { error: stockError } = await supabase.from('products').update({
      stock: product.stock - item.quantity,
      updated_at: new Date().toISOString()
    }).eq('id', item.productId);
    if (stockError) {
      return c.json({
        error: 'Failed to update stock'
      }, 400);
    }
  }
  const { data: order, error: orderError } = await supabase.from('orders').insert({
    user_id: user.id,
    user_email: user.email,
    total: parseFloat(total),
    shipping_address: shippingAddress,
    status: 'pending'
  }).select().single();
  if (orderError) {
    return c.json({
      error: orderError.message
    }, 400);
  }
  const orderItems = items.map((item)=>({
      order_id: order.id,
      product_id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));
  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    return c.json({
      error: itemsError.message
    }, 400);
  }
  const itemCount = items.reduce((sum, i)=>sum + Number(i.quantity || 0), 0);
  await supabase.from('activity_logs').insert({
    type: 'order_created',
    user_id: user.id,
    user_email: user.email,
    details: {
      order_id: order.id,
      total_amount: parseFloat(total),
      item_count: itemCount
    }
  });
  await supabase.from('cart_items').delete().eq('user_id', user.id);
  const { data: completeOrder } = await supabase.from('orders').select(`
      *,
      order_items:order_items(*)
    `).eq('id', order.id).single();
  const orderResponse = {
    ...completeOrder,
    items: completeOrder.order_items.map((item)=>({
        productId: item.product_id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity
      }))
  };
  return c.json({
    order: orderResponse
  }, 201);
});
app.put("/server/orders/:id/status", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const orderId = c.req.param('id');
  const { status } = await c.req.json();
  const { data: order } = await supabase.from('orders').select(`
      *,
      order_items:order_items(*)
    `).eq('id', orderId).single();
  if (!order) {
    return c.json({
      error: 'Order not found'
    }, 404);
  }
  const previousStatus = order.status;
  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    for (const item of order.order_items){
      const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
      if (product) {
        await supabase.from('products').update({
          stock: product.stock + item.quantity,
          updated_at: new Date().toISOString()
        }).eq('id', item.product_id);
      }
    }
  }
  const { data: updatedOrder, error } = await supabase.from('orders').update({
    status,
    updated_at: new Date().toISOString(),
    updated_by: user.id
  }).eq('id', orderId).select(`
      *,
      order_items:order_items(*)
    `).single();
  if (error) {
    return c.json({
      error: error.message
    }, 400);
  }
  await supabase.from('activity_logs').insert({
    type: 'order_status_updated',
    user_id: user.id,
    user_email: user.email,
    details: {
      order_id: orderId,
      previous_status: previousStatus,
      newStatus: status
    }
  });
  const orderResponse = {
    ...updatedOrder,
    items: updatedOrder.order_items.map((item)=>({
        productId: item.product_id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity
      }))
  };
  return c.json({
    order: orderResponse
  });
});
app.get("/server/admin/analytics", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const { data: orders } = await supabase.from('orders').select('*');
  const { data: products } = await supabase.from('products').select('*');
  const { data: categories } = await supabase.from('categories').select('*');
  const { count: usersCount } = await supabase.from('users').select('*', {
    count: 'exact',
    head: true
  }).eq('role', 'user');
  const totalRevenue = (orders || []).reduce((sum, order)=>{
    if (order.status !== 'cancelled') {
      return sum + parseFloat(order.total || 0);
    }
    return sum;
  }, 0);
  const totalOrders = (orders || []).length;
  const pendingOrders = (orders || []).filter((o)=>o.status === 'pending').length;
  const completedOrders = (orders || []).filter((o)=>o.status === 'delivered').length;
  const cancelledOrders = (orders || []).filter((o)=>o.status === 'cancelled').length;
  const totalProducts = (products || []).length;
  const totalCategories = (categories || []).length;
  const totalUsers = usersCount || 0;
  const lowStockProducts = (products || []).filter((p)=>p.stock < 10);
  const { data: recentOrdersData } = await supabase.from('orders').select(`
      *,
      order_items:order_items(*)
    `).order('created_at', {
    ascending: false
  }).limit(10);
  const recentOrders = (recentOrdersData || []).map((order)=>({
      ...order,
      items: order.order_items
    }));
  const last7Days = [];
  for(let i = 6; i >= 0; i--){
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayRevenue = (orders || []).reduce((sum, order)=>{
      const orderDate = order.created_at?.split('T')[0];
      if (orderDate === dateStr && order.status !== 'cancelled') {
        return sum + parseFloat(order.total || 0);
      }
      return sum;
    }, 0);
    last7Days.push({
      date: dateStr,
      revenue: dayRevenue
    });
  }
  return c.json({
    statistics: {
      totalRevenue,
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalProducts,
      totalCategories,
      totalUsers
    },
    lowStockProducts,
    recentOrders,
    revenueChart: last7Days
  });
});
app.get("/server/admin/logs", async (c)=>{
  const user = await verifyUser(c.req.raw);
  if (!user) {
    return c.json({
      error: 'Unauthorized'
    }, 401);
  }
  const supabase = getSupabaseClient();
  const userData = await getOrCreateUserRecord(supabase, user.id, user.email);
  if (userData?.role !== 'admin') {
    return c.json({
      error: 'Admin access required'
    }, 403);
  }
  const { data: logs } = await supabase.from('activity_logs').select('*').order('created_at', {
    ascending: false
  }).limit(100);
  const transformedLogs = (logs || []).map((log)=>({
      id: log.id,
      type: log.type,
      userId: log.user_id,
      userEmail: log.user_email,
      timestamp: log.created_at,
      orderId: log.details?.order_id,
      totalAmount: log.details?.total_amount,
      itemCount: log.details?.item_count,
      previousStatus: log.details?.previous_status,
      newStatus: log.details?.new_status
    }));
  return c.json({
    logs: transformedLogs
  });
});
Deno.serve(app.fetch);
