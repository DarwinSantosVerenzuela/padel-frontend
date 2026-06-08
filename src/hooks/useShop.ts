'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ProductCategory {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  website: string | null;
  is_official: boolean;
  is_featured: boolean;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  avg_rating: number;
  total_reviews: number;
  total_sold: number;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  store_name?: string;
  store?: Store;
  category?: ProductCategory;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  created_at: string;
  // Joined
  product?: Product;
}

interface FetchProductsFilters {
  categoryId?: string;
  storeId?: string;
  search?: string;
  featured?: boolean;
}

const CART_LOCAL_KEY = 'pronet_cart';

interface LocalCartItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
}

function getLocalCart(): LocalCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCart(items: LocalCartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_LOCAL_KEY, JSON.stringify(items));
  // Notify BottomNav badge
  window.dispatchEvent(new Event('cart-updated'));
}

function clearLocalCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_LOCAL_KEY);
}

export function useShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Resolve auth state
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => { subscription.unsubscribe(); };
  }, [supabase]);

  // ── Fetch Categories ──────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[useShop] Categories error:', error.message);
      }
      if (data) setCategories(data as ProductCategory[]);
    } catch (e) {
      console.error('[useShop] fetchCategories failed:', e);
    }
  }, [supabase]);

  // ── Fetch Stores ──────────────────────────────────────────────────
  const fetchStores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, description, logo_url, cover_image_url, website, is_official, is_featured')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[useShop] Stores error:', error.message);
      }
      if (data) setStores(data as Store[]);
    } catch (e) {
      console.error('[useShop] fetchStores failed:', e);
    }
  }, [supabase]);

  // ── Fetch Products ────────────────────────────────────────────────
  const fetchProducts = useCallback(async (filters?: FetchProductsFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*, stores(name)')
        .eq('is_active', true);

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.storeId) {
        query = query.eq('store_id', filters.storeId);
      }
      if (filters?.featured) {
        query = query.eq('is_featured', true);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      query = query.order('is_featured', { ascending: false })
                    .order('created_at', { ascending: false });

      if (filters?.featured) {
        query = query.limit(10);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useShop] Products error:', error.message);
      }
      if (data) {
        const mapped = (data as any[]).map((p) => ({
          ...p,
          price: Number(p.price) || 0,
          compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
          avg_rating: Number(p.avg_rating) || 0,
          total_reviews: p.total_reviews || 0,
          total_sold: p.total_sold || 0,
          images: p.images || [],
          sizes: p.sizes || [],
          colors: p.colors || [],
          metadata: p.metadata || {},
          store_name: p.stores?.name || null,
        })) as Product[];
        setProducts(mapped);
      }
    } catch (e) {
      console.error('[useShop] fetchProducts failed:', e);
    }
    setLoading(false);
  }, [supabase]);

  // ── Derived: Featured Products ────────────────────────────────────
  const featuredProducts = products.filter((p) => p.is_featured);

  // ── Fetch Cart ────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!userId) {
      // No user — load from local storage
      const local = getLocalCart();
      if (local.length === 0) {
        setCart([]);
        return;
      }
      // Fetch product data for local cart items
      const productIds = [...new Set(local.map((i) => i.product_id))];
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      const localCart: CartItem[] = local.map((item, idx) => ({
        id: `local-${idx}`,
        user_id: '',
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        created_at: new Date().toISOString(),
        product: productData?.find((p: any) => p.id === item.product_id) as Product | undefined,
      }));
      setCart(localCart);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useShop] Cart error:', error.message);
      }
      if (data) setCart(data as CartItem[]);
    } catch (e) {
      console.error('[useShop] fetchCart failed:', e);
    }
  }, [supabase, userId]);

  // ── Sync local cart to Supabase on login ──────────────────────────
  useEffect(() => {
    if (!userId) return;
    const local = getLocalCart();
    if (local.length === 0) return;

    const syncCart = async () => {
      for (const item of local) {
        await supabase.from('cart_items').upsert({
          user_id: userId,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        }, { onConflict: 'user_id,product_id,variant_id' }).then(() => {});
      }
      clearLocalCart();
      fetchCart();
    };
    syncCart();
  }, [userId, supabase, fetchCart]);

  // ── Add to Cart ───────────────────────────────────────────────────
  const addToCart = useCallback(async (productId: string, variantId?: string, quantity: number = 1) => {
    if (!userId) {
      // Local cart
      const local = getLocalCart();
      const existing = local.find(
        (i) => i.product_id === productId && i.variant_id === (variantId ?? null)
      );
      if (existing) {
        existing.quantity += quantity;
      } else {
        local.push({ product_id: productId, variant_id: variantId ?? null, quantity });
      }
      setLocalCart(local);
      await fetchCart();

      // Silent analytics
      logActivity('cart_add', 'product', productId);
      return;
    }

    try {
      const { error } = await supabase.from('cart_items').upsert({
        user_id: userId,
        product_id: productId,
        variant_id: variantId ?? null,
        quantity,
      }, { onConflict: 'user_id,product_id,variant_id' });

      if (error) console.error('[useShop] addToCart error:', error.message);
      await fetchCart();

      logActivity('cart_add', 'product', productId);
    } catch (e) {
      console.error('[useShop] addToCart failed:', e);
    }
  }, [supabase, userId, fetchCart]);

  // ── Remove from Cart ──────────────────────────────────────────────
  const removeFromCart = useCallback(async (itemId: string) => {
    if (!userId || itemId.startsWith('local-')) {
      // Local cart
      const local = getLocalCart();
      const idx = parseInt(itemId.replace('local-', ''), 10);
      if (!isNaN(idx) && idx >= 0 && idx < local.length) {
        const removed = local.splice(idx, 1)[0];
        setLocalCart(local);
        await fetchCart();
        if (removed) logActivity('cart_remove', 'product', removed.product_id);
      }
      return;
    }

    try {
      // Get product_id before deleting for analytics
      const item = cart.find((c) => c.id === itemId);
      const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
      if (error) console.error('[useShop] removeFromCart error:', error.message);
      await fetchCart();

      if (item) logActivity('cart_remove', 'product', item.product_id);
    } catch (e) {
      console.error('[useShop] removeFromCart failed:', e);
    }
  }, [supabase, userId, cart, fetchCart]);

  // ── Update Cart Quantity ──────────────────────────────────────────
  const updateCartQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    if (!userId || itemId.startsWith('local-')) {
      const local = getLocalCart();
      const idx = parseInt(itemId.replace('local-', ''), 10);
      if (!isNaN(idx) && idx >= 0 && idx < local.length) {
        local[idx].quantity = quantity;
        setLocalCart(local);
        await fetchCart();
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);
      if (error) console.error('[useShop] updateCartQuantity error:', error.message);
      await fetchCart();
    } catch (e) {
      console.error('[useShop] updateCartQuantity failed:', e);
    }
  }, [supabase, userId, fetchCart, removeFromCart]);

  // ── Cart computed values ──────────────────────────────────────────
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => {
    const price = item.product?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  // ── Fetch Wishlist ────────────────────────────────────────────────
  const fetchWishlist = useCallback(async () => {
    if (!userId) {
      setWishlist([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', userId);

      if (error) console.error('[useShop] Wishlist error:', error.message);
      if (data) setWishlist(data.map((w: any) => w.product_id));
    } catch (e) {
      console.error('[useShop] fetchWishlist failed:', e);
    }
  }, [supabase, userId]);

  // ── Toggle Wishlist ───────────────────────────────────────────────
  const toggleWishlist = useCallback(async (productId: string) => {
    if (!userId) return;

    const isWished = wishlist.includes(productId);

    try {
      if (isWished) {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', productId);
        if (error) console.error('[useShop] wishlist remove error:', error.message);
        setWishlist((prev) => prev.filter((id) => id !== productId));

        logActivity('wishlist_remove', 'product', productId);
      } else {
        const { error } = await supabase
          .from('wishlists')
          .insert({ user_id: userId, product_id: productId });
        if (error) console.error('[useShop] wishlist add error:', error.message);
        setWishlist((prev) => [...prev, productId]);

        logActivity('wishlist_add', 'product', productId);
      }
    } catch (e) {
      console.error('[useShop] toggleWishlist failed:', e);
    }
  }, [supabase, userId, wishlist]);

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.includes(productId);
  }, [wishlist]);

  // ── Analytics helpers (silent, non-blocking) ──────────────────────
  const logActivity = useCallback(async (action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) => {
    try {
      const uid = userId;
      if (!uid) return;
      await supabase.from('user_activity_log').insert({
        user_id: uid,
        action,
        target_type: targetType,
        target_id: targetId,
        metadata: metadata ?? {},
      }).then(() => {});
    } catch {
      // Silent fail — table may not exist yet
    }
  }, [supabase, userId]);

  const logProductView = useCallback(async (productId: string) => {
    await logActivity('product_view', 'product', productId);
  }, [logActivity]);

  const logStoreVisit = useCallback(async (storeId: string) => {
    await logActivity('store_visit', 'store', storeId);
  }, [logActivity]);

  const logShopSearch = useCallback(async (query: string) => {
    await logActivity('shop_search', 'product', '', { query });
  }, [logActivity]);

  // ── Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchCategories(),
        fetchProducts({ featured: true }),
        fetchStores(),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchCategories, fetchProducts, fetchStores]);

  // Load cart & wishlist when user changes
  useEffect(() => {
    fetchCart();
    fetchWishlist();
  }, [fetchCart, fetchWishlist]);

  return {
    // Data
    products,
    stores,
    categories,
    cart,
    loading,
    featuredProducts,

    // Fetch
    fetchProducts,
    fetchStores,
    fetchCategories,
    fetchCart,

    // Cart operations
    addToCart,
    removeFromCart,
    updateCartQuantity,
    cartCount,
    cartTotal,

    // Wishlist
    toggleWishlist,
    isInWishlist,
    wishlist,

    // Analytics (silent, non-blocking)
    logProductView,
    logStoreVisit,
    logShopSearch,

    // Refetch
    refetch: fetchProducts,
  };
}
