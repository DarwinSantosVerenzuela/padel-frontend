'use client';

import { useState, useEffect } from 'react';
import { Search, Star, Heart, ChevronRight, ShoppingBag, Package, ArrowRight } from 'lucide-react';
import { useShop, Product, Store } from '@/hooks/useShop';
import { useTranslation } from '@/i18n';
import ProNetLoader from '@/components/ui/ProNetLoader';
import styles from './page.module.css';

export default function ShopPage() {
  const {
    products: dbProducts, stores: dbStores, categories, loading,
    featuredProducts: dbFeatured, fetchProducts,
    toggleWishlist, isInWishlist,
    logProductView, logStoreVisit, logShopSearch,
  } = useShop();

  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // ====== HARDCODED DEMO DATA ======
  const demoStores: Store[] = [
    {
      id: 'store-pronet', owner_id: null, name: 'ProNet Merch', slug: 'pronet-merch',
      description: 'La tienda oficial de ProNet. Merch exclusivo, ropa deportiva y accesorios premium para los verdaderos players. 🔥',
      logo_url: null, cover_image_url: null, website: null,
      is_official: true, commission_rate: 0, is_active: true, is_featured: true,
      created_at: '', updated_at: '',
    },
    {
      id: 'store-bullpadel', owner_id: null, name: 'Bullpadel Store', slug: 'bullpadel-store',
      description: 'Palas, ropa y accesorios oficiales Bullpadel. Potencia tu juego con tecnología de élite.',
      logo_url: null, cover_image_url: null, website: 'https://bullpadel.com',
      is_official: false, commission_rate: 12, is_active: true, is_featured: true,
      created_at: '', updated_at: '',
    },
    {
      id: 'store-adidas', owner_id: null, name: 'Adidas Padel', slug: 'adidas-padel',
      description: 'Línea completa de pádel Adidas. Adipower, Metalbone y más para todos los niveles.',
      logo_url: null, cover_image_url: null, website: 'https://adidas.com',
      is_official: false, commission_rate: 10, is_active: true, is_featured: true,
      created_at: '', updated_at: '',
    },
    {
      id: 'store-head', owner_id: null, name: 'Head Padel', slug: 'head-padel',
      description: 'Tecnología Graphene 360+ para máxima estabilidad. Palas y accesorios HEAD.',
      logo_url: null, cover_image_url: null, website: 'https://head.com',
      is_official: false, commission_rate: 10, is_active: true, is_featured: false,
      created_at: '', updated_at: '',
    },
    {
      id: 'store-asics', owner_id: null, name: 'Asics Padel', slug: 'asics-padel',
      description: 'Calzado profesional de pádel con tecnología GEL. Máxima amortiguación en pista.',
      logo_url: null, cover_image_url: null, website: 'https://asics.com',
      is_official: false, commission_rate: 11, is_active: true, is_featured: false,
      created_at: '', updated_at: '',
    },
  ];

  const demoProducts: Product[] = [
    {
      id: 'p1', store_id: 'store-pronet', category_id: 'c-merch', name: 'Camiseta ProNet Pro',
      slug: 'camiseta-pronet-pro', description: 'Camiseta técnica oficial. Dry-Fit transpirable.',
      price: 39.99, compare_at_price: null, currency: 'USD',
      images: ['/products/camiseta-pronet.png'], sizes: ['S','M','L','XL'],
      colors: ['Negro', 'Blanco'], stock: 100, is_active: true, is_featured: true,
      avg_rating: 4.8, total_reviews: 42, total_sold: 156, metadata: {}, created_at: '',
      store_name: 'ProNet Merch',
    },
    {
      id: 'p2', store_id: 'store-pronet', category_id: 'c-merch', name: 'Gorra ProNet Elite',
      slug: 'gorra-pronet-elite', description: 'Gorra snapback oficial con logo bordado. UV 50+.',
      price: 24.99, compare_at_price: null, currency: 'USD',
      images: ['/products/gorra-pronet.png'], sizes: ['Única'],
      colors: ['Negro', 'Blanco'], stock: 60, is_active: true, is_featured: true,
      avg_rating: 4.9, total_reviews: 28, total_sold: 89, metadata: {}, created_at: '',
      store_name: 'ProNet Merch',
    },
    {
      id: 'p3', store_id: 'store-pronet', category_id: 'c-merch', name: 'Paletero ProNet Elite',
      slug: 'paletero-pronet-elite', description: 'Bolsa premium con compartimento térmico para 3 palas.',
      price: 69.99, compare_at_price: 89.99, currency: 'USD',
      images: ['/products/paletero-pronet.png'], sizes: [],
      colors: ['Negro/Dorado'], stock: 45, is_active: true, is_featured: false,
      avg_rating: 4.7, total_reviews: 15, total_sold: 34, metadata: {}, created_at: '',
      store_name: 'ProNet Merch',
    },
    {
      id: 'p4', store_id: 'store-bullpadel', category_id: 'c-rackets', name: 'Bullpadel Vertex 04',
      slug: 'bullpadel-vertex-04', description: 'Pala de diamante, carbono 18K. Máxima potencia.',
      price: 289.99, compare_at_price: 349.99, currency: 'USD',
      images: ['/products/racket-vertex.png'], sizes: [],
      colors: ['Negro/Rojo'], stock: 25, is_active: true, is_featured: true,
      avg_rating: 4.9, total_reviews: 67, total_sold: 203, metadata: {}, created_at: '',
      store_name: 'Bullpadel Store',
    },
    {
      id: 'p5', store_id: 'store-adidas', category_id: 'c-rackets', name: 'Adidas Adipower CTRL 3.2',
      slug: 'adidas-adipower-ctrl', description: 'Control total. Eva Soft Performance, carbono aluminizado.',
      price: 219.99, compare_at_price: null, currency: 'USD',
      images: ['/products/racket-vertex.png'], sizes: [],
      colors: ['Blanco/Azul'], stock: 30, is_active: true, is_featured: true,
      avg_rating: 4.6, total_reviews: 34, total_sold: 98, metadata: {}, created_at: '',
      store_name: 'Adidas Padel',
    },
    {
      id: 'p6', store_id: 'store-head', category_id: 'c-rackets', name: 'Head Flash Pro 2024',
      slug: 'head-flash-pro', description: 'Graphene 360+, gran punto dulce. Todos los niveles.',
      price: 149.99, compare_at_price: 179.99, currency: 'USD',
      images: ['https://placehold.co/400x400/16213e/e94560?text=Flash+Pro'], sizes: [],
      colors: ['Azul/Negro'], stock: 40, is_active: true, is_featured: false,
      avg_rating: 4.4, total_reviews: 22, total_sold: 67, metadata: {}, created_at: '',
      store_name: 'Head Padel',
    },
    {
      id: 'p7', store_id: 'store-asics', category_id: 'c-shoes', name: 'Asics Gel-Padel Pro 5',
      slug: 'asics-gel-padel-5', description: 'Tecnología GEL, suela Omni, estabilidad superior.',
      price: 129.99, compare_at_price: 159.99, currency: 'USD',
      images: ['/products/shoes-asics.png'], sizes: ['40','41','42','43','44'],
      colors: ['Blanco/Azul'], stock: 35, is_active: true, is_featured: true,
      avg_rating: 4.7, total_reviews: 53, total_sold: 145, metadata: {}, created_at: '',
      store_name: 'Asics Padel',
    },
    {
      id: 'p8', store_id: 'store-pronet', category_id: 'c-accessories', name: 'Overgrip ProNet Premium x3',
      slug: 'overgrip-pronet-3', description: 'Máxima absorción y tacto seco. Pack de 3.',
      price: 9.99, compare_at_price: 14.99, currency: 'USD',
      images: ['https://placehold.co/400x400/0f3460/00d2ff?text=Overgrip+x3'], sizes: [],
      colors: ['Blanco', 'Negro'], stock: 200, is_active: true, is_featured: false,
      avg_rating: 4.5, total_reviews: 89, total_sold: 412, metadata: {}, created_at: '',
      store_name: 'ProNet Merch',
    },
    {
      id: 'p9', store_id: 'store-pronet', category_id: 'c-clothing', name: 'Short ProNet Match',
      slug: 'short-pronet-match', description: 'Pantalón corto 4-way stretch, bolsillos para pelotas.',
      price: 34.99, compare_at_price: null, currency: 'USD',
      images: ['https://placehold.co/400x400/2b2d42/30d158?text=Short+Match'], sizes: ['S','M','L','XL'],
      colors: ['Negro', 'Azul Navy'], stock: 80, is_active: true, is_featured: false,
      avg_rating: 4.6, total_reviews: 31, total_sold: 78, metadata: {}, created_at: '',
      store_name: 'ProNet Merch',
    },
    {
      id: 'p10', store_id: 'store-bullpadel', category_id: 'c-accessories', name: 'Muñequera Bullpadel BPM',
      slug: 'munequera-bullpadel', description: 'Muñequera técnica absorbente. Pack de 2.',
      price: 12.99, compare_at_price: null, currency: 'USD',
      images: ['https://placehold.co/400x400/533483/e94560?text=Muñequera+BPM'], sizes: [],
      colors: ['Negro', 'Rojo'], stock: 150, is_active: true, is_featured: false,
      avg_rating: 4.3, total_reviews: 18, total_sold: 56, metadata: {}, created_at: '',
      store_name: 'Bullpadel Store',
    },
  ];

  // Use DB data if available, otherwise hardcoded
  const stores = dbStores.length > 0 ? dbStores : demoStores;
  const products = dbProducts.length > 0 ? dbProducts : demoProducts;
  const featuredProducts = dbFeatured.length > 0 ? dbFeatured : demoProducts.filter(p => p.is_featured);

  // Filter products by category
  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products;

  // Search handler with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (query.trim().length > 2) {
      const timeout = setTimeout(() => {
        fetchProducts({ search: query.trim() });
        logShopSearch(query.trim());
      }, 400);
      setSearchTimeout(timeout);
    } else if (query.trim().length === 0) {
      fetchProducts({});
    }
  };

  // Category filter
  const handleCategoryClick = (catId: string | null) => {
    setActiveCategory(catId);
    if (catId) {
      fetchProducts({ categoryId: catId });
    } else {
      fetchProducts({});
    }
  };

  // Find ProNet official store
  const officialStore = stores.find(s => s.is_official);
  const partnerStores = stores.filter(s => !s.is_official);

  return (
    <div className={styles.shop}>
      {/* Hero */}
      <div className={styles.heroSection}>
        <h1 className="section-title">{t('shop.title') !== 'shop.title' ? t('shop.title') : '🛍️ Tienda'}</h1>
        <p className="section-subtitle">{t('shop.subtitle') !== 'shop.subtitle' ? t('shop.subtitle') : 'Encuentra el equipo perfecto'}</p>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder={t('shop.search') !== 'shop.search' ? t('shop.search') : 'Buscar productos...'}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className={styles.categoriesRow}>
        <button
          className={`${styles.categoryChip} ${activeCategory === null ? styles.categoryActive : ''}`}
          onClick={() => handleCategoryClick(null)}
        >
          <span className={styles.categoryIcon}>🔥</span>
          <span className={styles.categoryLabel}>Todas</span>
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`${styles.categoryChip} ${activeCategory === cat.id ? styles.categoryActive : ''}`}
            onClick={() => handleCategoryClick(cat.id)}
          >
            <span className={styles.categoryIcon}>{cat.icon}</span>
            <span className={styles.categoryLabel}>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Official ProNet Store — Unique Card */}
      {officialStore && (
        <div className={styles.officialStoreCard}>
          <div className={styles.officialBadge}>
            <ShoppingBag size={12} /> TIENDA OFICIAL
          </div>
          <h2 className={styles.officialStoreName}>{officialStore.name}</h2>
          <p className={styles.officialStoreDesc}>
            {officialStore.description || 'Mercancía exclusiva ProNet. Equipo premium para los mejores jugadores.'}
          </p>
          <div className={styles.officialStoreMeta}>
            <span>🏓 Equipamiento profesional</span>
            <span>⭐ Calidad premium</span>
          </div>
          <button
            className={styles.officialStoreBtn}
            onClick={() => {
              handleCategoryClick(null);
              logStoreVisit(officialStore.id);
            }}
          >
            Explorar tienda <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <div>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>⭐ Productos Destacados</h3>
            <button className={styles.sectionLink} onClick={() => handleCategoryClick(null)}>
              Ver todo <ChevronRight size={12} style={{ display: 'inline' }} />
            </button>
          </div>
          <div className={styles.featuredScroll}>
            {featuredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                featured
                isWishlisted={isInWishlist(product.id)}
                onWishlist={() => toggleWishlist(product.id)}
                onView={() => logProductView(product.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Partner Stores */}
      {partnerStores.length > 0 && (
        <div>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>🏪 Tiendas Partner</h3>
          </div>
          <div className={styles.storesList}>
            {partnerStores.map(store => (
              <div
                key={store.id}
                className={styles.storeCard}
                onClick={() => {
                  logStoreVisit(store.id);
                }}
              >
                <div className={styles.storeLogo}>
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                  ) : '🏪'}
                </div>
                <div className={styles.storeInfo}>
                  <div className={styles.storeName}>{store.name}</div>
                  <div className={styles.storeMeta}>{store.description?.slice(0, 60) || 'Equipamiento deportivo'}</div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Products Grid */}
      <div>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Package size={14} style={{ display: 'inline', marginRight: 6 }} />
            {activeCategory ? categories.find(c => c.id === activeCategory)?.name || 'Productos' : 'Todos los Productos'}
          </h3>
          <span className={styles.sectionLink}>{filteredProducts.length} productos</span>
        </div>

        {loading ? (
          <ProNetLoader text="Cargando productos..." />
        ) : filteredProducts.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <span className={styles.emptyIcon}>🛒</span>
            <p className={styles.emptyTitle}>No hay productos aún</p>
            <p className={styles.emptySubtitle}>Próximamente nuevos productos en la tienda</p>
          </div>
        ) : (
          <div className={styles.productsGrid}>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={isInWishlist(product.id)}
                onWishlist={() => toggleWishlist(product.id)}
                onView={() => logProductView(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Product Card Component ===== */
function ProductCard({
  product,
  featured = false,
  isWishlisted = false,
  onWishlist,
  onView,
}: {
  product: Product;
  featured?: boolean;
  isWishlisted?: boolean;
  onWishlist?: () => void;
  onView?: () => void;
}) {
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  return (
    <div
      className={`${styles.productCard} ${featured ? styles.productCardFeatured : ''}`}
      onClick={onView}
    >
      <div className={styles.productImageWrap}>
        <div className={styles.productImage}>
          {product.images && product.images.length > 0 ? (
            <img src={product.images[0]} alt={product.name} loading="lazy" />
          ) : (
            '🏓'
          )}
        </div>
        {hasDiscount && (
          <span className={styles.productBadge}>-{discountPercent}%</span>
        )}
        {product.is_featured && !hasDiscount && (
          <span className={styles.productBadge}>⭐ TOP</span>
        )}
        <button
          className={`${styles.wishlistBtn} ${isWishlisted ? styles.wishlistActive : ''}`}
          onClick={(e) => { e.stopPropagation(); onWishlist?.(); }}
        >
          <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className={styles.productInfo}>
        <span className={styles.productName}>{product.name}</span>
        <span className={styles.productStore}>{product.store_name || 'ProNet Official'}</span>
        <div className={styles.productPriceRow}>
          <span className={styles.productPrice}>${product.price.toFixed(2)}</span>
          {hasDiscount && (
            <span className={styles.productOldPrice}>${product.compare_at_price!.toFixed(2)}</span>
          )}
        </div>
        {product.avg_rating > 0 && (
          <div className={styles.productRating}>
            <Star size={10} fill="currentColor" />
            {product.avg_rating.toFixed(1)}
            <span style={{ color: 'var(--text-tertiary)' }}>({product.total_reviews})</span>
          </div>
        )}
      </div>
    </div>
  );
}
