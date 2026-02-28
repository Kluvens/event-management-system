import { useState } from 'react'
import {
  Award,
  Palette,
  Zap,
  Star,
  Package,
  LayoutGrid,
  Coins,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import {
  useStoreProducts,
  usePurchaseProduct,
  useMyPurchases,
} from '@/api/store'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import type { StoreCategory, StoreProduct } from '@/types'

const CATEGORIES: { value: StoreCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all',         label: 'All',         icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { value: 'Badge',       label: 'Badges',      icon: <Award className="h-3.5 w-3.5" /> },
  { value: 'Cosmetic',    label: 'Cosmetics',   icon: <Palette className="h-3.5 w-3.5" /> },
  { value: 'Feature',     label: 'Features',    icon: <Zap className="h-3.5 w-3.5" /> },
  { value: 'Perk',        label: 'Perks',        icon: <Star className="h-3.5 w-3.5" /> },
  { value: 'Collectible', label: 'Collectibles', icon: <Package className="h-3.5 w-3.5" /> },
]

const CATEGORY_COLORS: Record<StoreCategory, string> = {
  Badge:       'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700',
  Cosmetic:    'border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700',
  Feature:     'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700',
  Perk:        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700',
  Collectible: 'border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-700',
}

const CATEGORY_ICONS: Record<StoreCategory, React.ReactNode> = {
  Badge:       <Award className="h-8 w-8" />,
  Cosmetic:    <Palette className="h-8 w-8" />,
  Feature:     <Zap className="h-8 w-8" />,
  Perk:        <Star className="h-8 w-8" />,
  Collectible: <Package className="h-8 w-8" />,
}

function ProductCard({
  product,
  userPoints,
  onPurchase,
}: {
  product: StoreProduct
  userPoints: number
  onPurchase: (product: StoreProduct) => void
}) {
  const canAfford = userPoints >= product.pointCost
  const cat = product.category as StoreCategory

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Icon area */}
      <div className="flex items-center justify-center rounded-t-xl bg-muted/40 py-8">
        <span className={`text-muted-foreground ${product.alreadyOwned ? 'opacity-50' : ''}`}>
          {CATEGORY_ICONS[cat]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Category badge */}
        <Badge variant="outline" className={`mb-2 w-fit text-xs ${CATEGORY_COLORS[cat]}`}>
          {product.category}
        </Badge>

        <h3 className="mb-1 text-sm font-semibold text-card-foreground sm:text-base">
          {product.name}
        </h3>
        <p className="mb-4 flex-1 text-xs leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Coins className="h-4 w-4 text-amber-500" />
            {product.pointCost.toLocaleString()}
          </div>

          {product.alreadyOwned ? (
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Owned
            </div>
          ) : (
            <Button
              size="sm"
              variant={canAfford ? 'default' : 'outline'}
              disabled={!canAfford}
              onClick={() => onPurchase(product)}
              className="h-8 text-xs"
            >
              {canAfford ? 'Purchase' : 'Not Enough Points'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function StorePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [activeTab, setActiveTab] = useState<'store' | 'owned'>('store')
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | 'all'>('all')
  const [pendingProduct, setPendingProduct] = useState<StoreProduct | null>(null)

  const { data: products = [], isPending: loadingProducts } = useStoreProducts(
    selectedCategory === 'all' ? undefined : selectedCategory,
  )
  const { data: purchases = [], isPending: loadingPurchases } = useMyPurchases()
  const purchase = usePurchaseProduct()

  const userPoints = user?.loyaltyPoints ?? 0
  const remainingAfterPurchase = pendingProduct ? userPoints - pendingProduct.pointCost : 0

  function handleConfirmPurchase() {
    if (!pendingProduct) return
    purchase.mutate(pendingProduct.id, {
      onSuccess: (data) => {
        // Update auth store points immediately
        if (user) setUser({ ...user, loyaltyPoints: data.remainingPoints })
        setPendingProduct(null)
      },
    })
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="h-5 w-5 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Loyalty Store</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Spend your points on exclusive items
            </p>
          </div>
        </div>

        {/* Points balance */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-900/20">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            {userPoints.toLocaleString()} points
          </span>
        </div>
      </div>

      {/* Main tabs: Store / My Items */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'store' | 'owned')}>
        <TabsList className="mb-6">
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="owned">My Items</TabsTrigger>
        </TabsList>

        {/* ── Store tab ── */}
        <TabsContent value="store">
          {/* Category filter */}
          <div className="mb-5 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'border-amber-600 bg-amber-600 text-white'
                    : 'border-border bg-card text-muted-foreground hover:border-amber-400 hover:text-foreground'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {loadingProducts ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <Package className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No items in this category yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  userPoints={userPoints}
                  onPurchase={setPendingProduct}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── My Items tab ── */}
        <TabsContent value="owned">
          {loadingPurchases ? (
            <LoadingSpinner />
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <ShoppingBag className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <h2 className="mb-1 font-semibold text-foreground">No items yet</h2>
              <p className="text-sm text-muted-foreground">
                Purchase items from the store to see them here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col rounded-xl border border-border bg-card shadow-sm"
                >
                  <div className="flex items-center justify-center rounded-t-xl bg-muted/40 py-8">
                    <span className="text-muted-foreground">
                      {CATEGORY_ICONS[p.product.category as StoreCategory]}
                    </span>
                  </div>
                  <div className="p-4">
                    <Badge
                      variant="outline"
                      className={`mb-2 w-fit text-xs ${CATEGORY_COLORS[p.product.category as StoreCategory]}`}
                    >
                      {p.product.category}
                    </Badge>
                    <h3 className="mb-1 text-sm font-semibold text-card-foreground">
                      {p.product.name}
                    </h3>
                    <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                      {p.product.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                        <span>{p.pointsSpent.toLocaleString()} pts spent</span>
                      </div>
                      <span>{formatDate(p.purchasedAt, 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Purchase confirmation dialog */}
      <Dialog open={!!pendingProduct} onOpenChange={(open) => !open && setPendingProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>

          {pendingProduct && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-1 text-sm font-semibold text-foreground">
                  {pendingProduct.name}
                </div>
                <div className="text-xs text-muted-foreground">{pendingProduct.description}</div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-medium text-foreground">
                    {pendingProduct.pointCost.toLocaleString()} pts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your balance</span>
                  <span className="font-medium text-foreground">
                    {userPoints.toLocaleString()} pts
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5">
                  <span className="text-muted-foreground">After purchase</span>
                  <span className="font-semibold text-foreground">
                    {remainingAfterPurchase.toLocaleString()} pts
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPurchase} disabled={purchase.isPending}>
              {purchase.isPending ? 'Purchasing…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
