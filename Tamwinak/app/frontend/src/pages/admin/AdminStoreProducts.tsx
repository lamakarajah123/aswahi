import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Store, ArrowRight, RefreshCw, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Product, AdminStore, Industry } from './types';
import { AllProductsPanel } from '@/components/admin/AllProductsPanel';
import { StoreProductsPanel } from '@/components/admin/StoreProductsPanel';

const PAGE_SIZE = 50;

export default function AdminStoreProducts() {
    const { t, currentLanguage } = useLanguage();
    const [stores, setStores] = useState<AdminStore[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [storeProducts, setStoreProducts] = useState<Product[]>([]);
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>('');
    const [loadingStoreProducts, setLoadingStoreProducts] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [leftPage, setLeftPage] = useState(1);
    const [leftTotalPages, setLeftTotalPages] = useState(1);
    const [showAddAllConfirm, setShowAddAllConfirm] = useState(false);
    const [leftSearch, setLeftSearch] = useState('');
    const [leftCategory, setLeftCategory] = useState('');
    const [leftIndustry, setLeftIndustry] = useState('');
    const [rightSearch, setRightSearch] = useState('');
    const [selectedLeft, setSelectedLeft] = useState<Set<number>>(new Set());
    const [selectedRight, setSelectedRight] = useState<Set<number>>(new Set());
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editQuantity, setEditQuantity] = useState<number>(0);
    const [editSalePrice, setEditSalePrice] = useState<string>(''); // Change to string for easy empty handling
    const [editAvailableUnits, setEditAvailableUnits] = useState<number[] | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const location = useLocation();

    useEffect(() => { loadInitialData(); }, []);

    useEffect(() => {
        const stateStoreId = (location.state as any)?.storeId;
        if (stateStoreId) setSelectedStore(String(stateStoreId));
    }, [location.state]);

    useEffect(() => {
        if (selectedStore) loadStoreProducts(parseInt(selectedStore));
        else setStoreProducts([]);
        setSelectedLeft(new Set());
        setSelectedRight(new Set());
    }, [selectedStore]);

    const loadInitialData = useCallback(async (p = 1, search = '', category = '', industryId = '') => {
        try {
            setInitialLoading(p === 1);
            const params: Record<string, any> = { limit: PAGE_SIZE, skip: (p - 1) * PAGE_SIZE };
            if (search) params.search = search;
            if (category) params.category = category;
            if (industryId) params.industry_id = industryId;

            const [productsRes, storesRes, industriesRes] = await Promise.all([
                apiCall.invoke({ url: '/api/v1/entities/products', method: 'GET', params }),
                stores.length === 0 ? apiCall.invoke({ url: '/api/v1/grocery/admin/stores', method: 'GET' }) : Promise.resolve({ data: stores }),
                industries.length === 0 ? apiCall.invoke({ url: '/api/v1/industries', method: 'GET' }) : Promise.resolve({ data: industries }),
            ]);
            const raw = productsRes.data;
            const items: Product[] = raw?.items || raw?.data || (Array.isArray(raw) ? raw : []);
            const total: number = raw?.total ?? items.length;
            setAllProducts(items);
            setLeftTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
            setLeftPage(p);
            if (stores.length === 0) {
                const storesData = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data?.data || []);
                setStores(storesData);
            }
            if (industries.length === 0) setIndustries(Array.isArray(industriesRes.data) ? industriesRes.data : []);
        } catch {
            toast.error(t('error.save_unit', 'Failed to load data'));
        } finally {
            setInitialLoading(false);
        }
    }, [stores, industries, t]);

    const handleLeftFilter = useCallback((search: string, category: string, industryId: string) => {
        loadInitialData(1, search, category, industryId);
    }, [loadInitialData]);

    const loadStoreProducts = async (storeId: number) => {
        try {
            setLoadingStoreProducts(true);
            const res = await apiCall.invoke({ url: `/api/v1/store-products/${storeId}`, method: 'GET' });
            setStoreProducts(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error(t('error.load_units', 'Failed to load store products'));
        } finally {
            setLoadingStoreProducts(false);
        }
    };

    const storeProductIds = useMemo(() => new Set(storeProducts.map((p) => p.id)), [storeProducts]);

    const filteredLeftProducts = useMemo(
        () => allProducts.filter((p) => !storeProductIds.has(p.id)),
        [allProducts, storeProductIds]
    );

    const handleAddSelected = async () => {
        if (!selectedStore || selectedLeft.size === 0) return;
        
        // If only one product is selected, open the config dialog instead of adding immediately
        if (selectedLeft.size === 1) {
            const productId = Array.from(selectedLeft)[0];
            const p = allProducts.find(prod => prod.id === productId);
            if (p) {
                setEditingProduct(p);
                setEditQuantity(0);
                setEditSalePrice('');
                setEditAvailableUnits(p.product_units?.map(u => u.unit_id) || null);
                setIsAdding(true);
                return;
            }
        }

        try {
            await apiCall.invoke({
                url: `/api/v1/store-products/${selectedStore}/add`,
                method: 'POST',
                data: { product_ids: Array.from(selectedLeft) },
            });
            toast.success(`${selectedLeft.size} ${t('success.products_added', 'products added')}`);
            setSelectedLeft(new Set());
            await loadStoreProducts(parseInt(selectedStore));
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || t('error.add_products', 'Failed to add products'));
        }
    };

    const handleRemoveSelected = async () => {
        if (!selectedStore || selectedRight.size === 0) return;
        try {
            await apiCall.invoke({
                url: `/api/v1/store-products/${selectedStore}/remove`,
                method: 'DELETE',
                data: { product_ids: Array.from(selectedRight) },
            });
            toast.success(`${selectedRight.size} ${t('success.products_removed', 'products removed')}`);
            setSelectedRight(new Set());
            await loadStoreProducts(parseInt(selectedStore));
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || t('error.remove_products', 'Failed to remove products'));
        }
    };

    const handleAddOne = async (productId: number) => {
        if (!selectedStore) return;
        const p = allProducts.find(prod => prod.id === productId);
        if (!p) return;

        setEditingProduct(p);
        setEditQuantity(0);
        setEditSalePrice('');
        setEditAvailableUnits(p.product_units?.map(u => u.unit_id) || null);
        setIsAdding(true);
    };

    const handleRemoveOne = async (productId: number) => {
        if (!selectedStore) return;
        try {
            await apiCall.invoke({
                url: `/api/v1/store-products/${selectedStore}/remove`,
                method: 'DELETE',
                data: { product_ids: [productId] },
            });
            await loadStoreProducts(parseInt(selectedStore));
        } catch {
            toast.error(t('error.remove_products', 'Failed to remove product'));
        }
    };

    const handleUpdateQuantity = async () => {
        if (!selectedStore || !editingProduct) return;
        try {
            if (isAdding) {
                await apiCall.invoke({
                    url: `/api/v1/store-products/${selectedStore}/add`,
                    method: 'POST',
                    data: { 
                        product_ids: [editingProduct.id],
                        stock_quantity: editQuantity,
                        sale_price: editSalePrice ? parseFloat(editSalePrice) : null,
                        available_units: editAvailableUnits
                    },
                });
                toast.success(t('success.product_added', 'Product added successfully'));
            } else {
                await apiCall.invoke({
                    url: `/api/v1/store-products/${selectedStore}/products/${editingProduct.id}`,
                    method: 'PUT',
                    data: { 
                        stock_quantity: editQuantity,
                        sale_price: editSalePrice ? parseFloat(editSalePrice) : null,
                        available_units: editAvailableUnits
                    },
                });
                toast.success(t('success.product_updated', 'Stock & Price updated'));
            }
            setEditingProduct(null);
            setIsAdding(false);
            await loadStoreProducts(parseInt(selectedStore));
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || t('error.update_product', 'Failed to update mapping'));
        }
    };
    

    const confirmAddAll = async () => {
        if (!selectedStore) return;
        setShowAddAllConfirm(false);
        try {
            const res = await apiCall.invoke({
                url: `/api/v1/store-products/${selectedStore}/add-all`,
                method: 'POST',
            });
            toast.success(`${res.data.added} ${t('success.products_added', 'products added')}`);
            await loadStoreProducts(parseInt(selectedStore));
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || t('error.add_products', 'Failed to add all products'));
        }
    };

    const toggleLeftSelect = (id: number) => {
        const next = new Set(selectedLeft);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedLeft(next);
    };

    const toggleRightSelect = (id: number) => {
        const next = new Set(selectedRight);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedRight(next);
    };

    const selectAllLeft = () => {
        if (selectedLeft.size === filteredLeftProducts.length) setSelectedLeft(new Set());
        else setSelectedLeft(new Set(filteredLeftProducts.map((p) => p.id)));
    };

    const selectAllRight = () => {
        const filtered = rightSearch
            ? storeProducts.filter((p) => p.name.toLowerCase().includes(rightSearch.toLowerCase()))
            : storeProducts;
        if (selectedRight.size === filtered.length) setSelectedRight(new Set());
        else setSelectedRight(new Set(filtered.map((p) => p.id)));
    };

    const selectedStoreName = stores.find((s) => String(s.id) === selectedStore)?.name;

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {/* Header */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Layers className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900 text-lg">{t('admin.store_products.title', 'Store Product Mapping')}</h2>
                                <p className="text-sm text-gray-500">{t('admin.store_products.subtitle', 'Assign products to a store')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-[260px]">
                            <Store className="w-4 h-4 text-gray-400 shrink-0" />
                            <Select value={selectedStore} onValueChange={setSelectedStore}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder={t('admin.store_products.select_store', 'Select a store...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {stores.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {!selectedStore ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-200 p-16 text-center">
                        <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">{t('admin.store_products.no_store_selected', 'Select a store to manage its products')}</p>
                        <p className="text-sm text-gray-400 mt-1">{t('admin.store_products.no_store_selected_desc', 'Choose a store from the dropdown above to get started')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <AllProductsPanel
                            products={filteredLeftProducts}
                            industries={industries}
                            allProducts={allProducts}
                            selected={selectedLeft}
                            page={leftPage}
                            totalPages={leftTotalPages}
                            search={leftSearch}
                            category={leftCategory}
                            industry={leftIndustry}
                            onSearchChange={(v) => { setLeftSearch(v); handleLeftFilter(v, leftCategory, leftIndustry); }}
                            onCategoryChange={(v) => { setLeftCategory(v); handleLeftFilter(leftSearch, v, leftIndustry); }}
                            onIndustryChange={(v) => { setLeftIndustry(v); handleLeftFilter(leftSearch, leftCategory, v); }}
                            onToggleSelect={toggleLeftSelect}
                            onSelectAll={selectAllLeft}
                            onAddSelected={handleAddSelected}
                            onAddOne={handleAddOne}
                            onAddAll={() => setShowAddAllConfirm(true)}
                            onPageChange={(p) => loadInitialData(p, leftSearch, leftCategory, leftIndustry)}
                        />

                        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                            <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm">
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 h-full">
                            <StoreProductsPanel
                                products={storeProducts}
                                storeName={selectedStoreName}
                                selected={selectedRight}
                                loading={loadingStoreProducts}
                                search={rightSearch}
                                onSearchChange={setRightSearch}
                                onToggleSelect={toggleRightSelect}
                                onSelectAll={selectAllRight}
                                onRemoveSelected={handleRemoveSelected}
                                onRemoveOne={handleRemoveOne}
                                onRefresh={() => loadStoreProducts(parseInt(selectedStore))}
                                 onEdit={(p) => { 
                                    setEditingProduct(p); 
                                    setEditQuantity(p.stock_quantity ?? 0); 
                                    setEditSalePrice(p.sale_price !== null && p.sale_price !== undefined ? String(p.sale_price) : '');
                                    setEditAvailableUnits(p.available_units ?? null);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={showAddAllConfirm} onOpenChange={setShowAddAllConfirm}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('admin.store_products.confirm_add_all', 'Add ALL products to this store? This may take a moment.')}</DialogTitle>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddAllConfirm(false)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={confirmAddAll}>{t('common.confirm', 'Confirm')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingProduct} onOpenChange={(open) => { 
                if (!open) {
                    setEditingProduct(null);
                    setIsAdding(false);
                }
            }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {isAdding ? t('admin.store_products.add_to_store', 'Add to Store') : t('admin.store_products.edit_stock', 'Edit Stock Quantity')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <div className="flex items-center gap-3">
                            {editingProduct?.image_url && (
                                <img src={editingProduct.image_url} alt={editingProduct.name} className="w-12 h-12 rounded-lg object-cover" />
                            )}
                            <div>
                                <h4 className="font-semibold text-gray-900">{editingProduct?.name}</h4>
                                <p className="text-xs text-gray-500">{editingProduct?.category} · {editingProduct?.unit}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('admin.store_products.quantity', 'Stock Quantity')}</label>
                                <input 
                                    type="number" 
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all placeholder:text-gray-300"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('admin.store_products.store_price', 'Store Price (₪)')}</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all placeholder:text-gray-300"
                                    value={editSalePrice}
                                    onChange={(e) => setEditSalePrice(e.target.value)}
                                    placeholder={editingProduct?.price ? String(editingProduct.price) : '0.00'}
                                />
                                <p className="text-[10px] text-gray-400 italic">
                                    Leave empty to use base price.
                                </p>
                            </div>
                        </div>

                        {/* Available Units Selection */}
                        {editingProduct && editingProduct.product_units && editingProduct.product_units.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    {t('admin.store_products.available_units', 'Available Units')}
                                </label>
                                <div className="grid grid-cols-1 gap-1.5 mt-2">
                                    {editingProduct.product_units.map((pu) => {
                                        const unitId = pu.unit_id;
                                        const isSelected = editAvailableUnits === null || editAvailableUnits.includes(unitId);
                                        const unitName = currentLanguage?.code === 'ar' ? (pu.unit?.name_ar || pu.unit?.name) : pu.unit?.name;
                                        
                                        return (
                                            <label 
                                                key={unitId} 
                                                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                                                    isSelected ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-100 text-gray-400 opacity-60'
                                                }`}
                                            >
                                                <span className="text-sm font-medium">{unitName}</span>
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        const current = editAvailableUnits === null 
                                                            ? editingProduct.product_units?.map(u => u.unit_id) || [] 
                                                            : [...editAvailableUnits];
                                                        
                                                        const next = isSelected 
                                                            ? current.filter(id => id !== unitId)
                                                            : [...current, unitId];
                                                        
                                                        // Ensure at least one unit remains
                                                        if (next.length === 0) {
                                                            toast.error(t('error.at_least_one_unit', 'At least one unit must be available'));
                                                            return;
                                                        }
                                                        setEditAvailableUnits(next);
                                                    }}
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-gray-400 italic">
                                    {t('admin.store_products.unit_hint', 'Uncheck units that this store does not sell.')}
                                </p>
                            </div>
                        )}

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditingProduct(null); setIsAdding(false); }}>{t('common.cancel', 'Cancel')}</Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleUpdateQuantity}>
                            {isAdding ? t('common.add', 'Add') : t('common.save', 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
