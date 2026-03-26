import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Edit, Trash2, Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Product, Industry } from './types';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminProductUnitsDialog } from './AdminProductUnitsDialog';
import { AdminProductCustomizationDialog } from './AdminProductCustomizationDialog';
import { Settings2 } from 'lucide-react';

const STANDARD_CATEGORIES = ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Seafood', 'Bakery', 'Beverages', 'Pantry', 'Snacks', 'Frozen'];
const PAGE_SIZE = 50;

export default function AdminProducts() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [products, setProducts] = useState<Product[]>([]);
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterIndustry, setFilterIndustry] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    const [allDefinedCategories, setAllDefinedCategories] = useState<string[]>([]);

    const dynamicCategories = useMemo(() => {
        return Array.from(new Set([...STANDARD_CATEGORIES, ...allDefinedCategories]));
    }, [allDefinedCategories]);


    const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
    const [unitsDialogOpen, setUnitsDialogOpen] = useState(false);
    const [customDialogOpen, setCustomDialogOpen] = useState(false);
    const [selectedProductForUnits, setSelectedProductForUnits] = useState<Product | null>(null);
    const [selectedProductForCustoms, setSelectedProductForCustoms] = useState<Product | null>(null);

    useEffect(() => {
        loadData(1);
    }, []);

    const loadData = useCallback(async (p: number, search?: string, industryId?: string, category?: string) => {
        try {
            setLoading(true);
            const params: Record<string, any> = { limit: PAGE_SIZE, skip: (p - 1) * PAGE_SIZE };
            if (search) params.search = search;
            if (industryId) params.industry_id = industryId;
            if (category) params.category = category;

            const [productsRes, industriesRes, categoriesRes] = await Promise.all([
                apiCall.invoke({ url: '/api/v1/entities/products', method: 'GET', params }),
                industries.length === 0
                    ? apiCall.invoke({ url: '/api/v1/industries', method: 'GET' })
                    : Promise.resolve({ data: industries }),
                apiCall.invoke({ url: '/api/v1/categories', method: 'GET' }),
            ]);
            const raw = productsRes.data;
            const items: Product[] = raw?.items || raw?.data || (Array.isArray(raw) ? raw : []);
            const total: number = raw?.total ?? items.length;
            setProducts(items);
            setTotalCount(total);
            setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
            setPage(p);
            if (industries.length === 0) {
                setIndustries(Array.isArray(industriesRes.data) ? industriesRes.data : []);
            }
            if (Array.isArray(categoriesRes.data)) {
                setAllDefinedCategories(categoriesRes.data.map((c: any) => c.name));
            }
        } catch {
            toast.error(t('error.load_products', 'Failed to load products'));
        } finally {
            setLoading(false);
        }
    }, [industries, t]);

    const handleFilterChange = useCallback((search: string, industryId: string, category: string) => {
        loadData(1, search || undefined, industryId || undefined, category || undefined);
    }, [loadData]);

    const filteredProducts = products; // filtering is now server-side



    const handleDeleteProduct = async (p: Product) => {
        try {
            await apiCall.invoke({ url: `/api/v1/entities/products/${p.id}`, method: 'DELETE' });
            toast.success(t('success.delete_product', 'Product deleted'));
            setDeleteConfirm(null);
            loadData(page, searchQuery || undefined, filterIndustry || undefined, filterCategory || undefined);
        } catch {
            toast.error(t('error.delete_product', 'Failed to delete product'));
        }
    };

    const openEditProduct = (p: Product) => {
        navigate(`/admin/products/${p.id}/edit`);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 text-lg">{t('admin.products.title', 'Platform Products')}</h2>
                            <p className="text-sm text-gray-500">{totalCount} {t('admin.products.count', 'products in catalog')}</p>
                        </div>
                    </div>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0"
                        onClick={() => navigate('/admin/products/new')}
                    >
                        <Plus className="w-4 h-4" /> {t('admin.products.add', 'Add Product')}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            className="ltr:pl-9 rtl:pr-9"
                            placeholder={t('admin.products.search_placeholder', 'Search products...')}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                handleFilterChange(e.target.value, filterIndustry, filterCategory);
                            }}
                        />
                    </div>
                    <Select value={filterIndustry || 'all_industries'} onValueChange={(v) => {
                        const val = v === 'all_industries' ? '' : v;
                        setFilterIndustry(val);
                        handleFilterChange(searchQuery, val, filterCategory);
                    }}>
                        <SelectTrigger className="w-full sm:w-48">
                            <Filter className="w-3.5 h-3.5 mx-2 text-gray-400 shrink-0" />
                            <SelectValue placeholder={t('admin.products.all_industries', 'All Industries')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all_industries">{t('admin.products.all_industries', 'All Industries')}</SelectItem>
                            {industries.map(i => (
                                <SelectItem key={i.id} value={String(i.id)}>
                                    {i.icon} {i.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterCategory || 'all_categories'} onValueChange={(v) => {
                        const val = v === 'all_categories' ? '' : v;
                        setFilterCategory(val);
                        handleFilterChange(searchQuery, filterIndustry, val);
                    }}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder={t('admin.products.all_categories', 'All Categories')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all_categories">{t('admin.products.all_categories', 'All Categories')}</SelectItem>
                            {dynamicCategories.map(c => (
                                <SelectItem key={c} value={c}>{t(`category.${c.toLowerCase()}`, c)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">
                            {products.length === 0 ? t('admin.products.no_products_platform', 'No products registered on the platform') : t('admin.products.no_products_filter', 'No products match your filters')}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                    <th className="py-3 px-4 font-semibold text-start border-e border-gray-200 w-16"></th>
                                    <th className="py-3 px-4 font-semibold text-start border-e border-gray-200">{t('admin.products.table_name', 'Name')}</th>
                                    <th className="py-3 px-4 font-semibold text-start border-e border-gray-200">{t('admin.products.table_industry', 'Industry')}</th>
                                    <th className="py-3 px-4 font-semibold text-center border-e border-gray-200">{t('admin.products.table_price', 'Price')}</th>
                                    <th className="py-3 px-4 font-semibold text-center border-e border-gray-200">{t('admin.products.table_category', 'Category')}</th>
                                    <th className="py-3 px-4 font-semibold text-center">{t('admin.products.table_actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredProducts.map((p) => {
                                    const industry = p.industry || industries.find(i => i.id === p.industry_id);
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-2.5 px-4 border-e border-gray-200">
                                                {p.image_url ? (
                                                    <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-gray-100 mx-auto" loading="lazy" width={40} height={40} />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center rounded-lg text-gray-400 mx-auto">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-gray-900 border-e border-gray-200">{p.name}</td>
                                            <td className="py-3 px-4 border-e border-gray-200">
                                                {industry ? (
                                                    <span className="text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md font-medium border border-purple-100 whitespace-nowrap">
                                                        {industry.icon} {industry.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-gray-800 text-center border-e border-gray-200 w-32" dir="ltr">
                                                ₪{(Number(p.price) || 0).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-center border-e border-gray-200 w-32">
                                                <Badge variant="outline" className="text-xs bg-gray-50">{p.category ? t(`category.${p.category.toLowerCase()}`, p.category) : '—'}</Badge>
                                            </td>
                                            <td className="py-3 px-4 w-32">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 border border-transparent transition-all" onClick={() => { setSelectedProductForUnits(p); setUnitsDialogOpen(true); }} title={t('admin.products_form.units_title', 'Manage Units')}>
                                                        <Package className="w-4 h-4" />
                                                    </Button>

                                                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-transparent transition-all" onClick={() => { setSelectedProductForCustoms(p); setCustomDialogOpen(true); }} title={t('admin.products.customization_title', 'Manage Customizations')}>
                                                        <Settings2 className="w-4 h-4" />
                                                    </Button>

                                                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-transparent transition-all" onClick={() => openEditProduct(p)} title={t('admin.products.edit_tooltip', 'Edit Product')}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>

                                                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent transition-all" onClick={() => setDeleteConfirm(p)} title={t('admin.products.delete_tooltip', 'Delete Product')}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-2">
                    <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => loadData(page - 1, searchQuery || undefined, filterIndustry || undefined, filterCategory || undefined)}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                    <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => loadData(page + 1, searchQuery || undefined, filterIndustry || undefined, filterCategory || undefined)}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" /> {t('admin.products.delete_dialog_title', 'Delete Product')}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-gray-600 leading-relaxed">
                        {t('admin.products.delete_dialog_desc', 'Are you sure you want to delete')} <strong className="text-gray-900 border-b border-gray-300 mx-1">{deleteConfirm?.name}</strong>? {t('admin.products.delete_dialog_warning', 'This cannot be undone.')}
                    </p>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('common.cancel', 'Cancel')}</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all"
                            onClick={() => deleteConfirm && handleDeleteProduct(deleteConfirm)}
                        >
                            <Trash2 className="w-4 h-4 mx-1" />
                            {t('common.delete', 'Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedProductForUnits && (
                <AdminProductUnitsDialog
                    productId={selectedProductForUnits.id}
                    productName={selectedProductForUnits.name}
                    open={unitsDialogOpen}
                    onClose={() => {
                        setUnitsDialogOpen(false);
                        setSelectedProductForUnits(null);
                        loadData(page, searchQuery || undefined, filterIndustry || undefined, filterCategory || undefined);
                    }}
                />
            )}

            {selectedProductForCustoms && (
                <AdminProductCustomizationDialog
                    productId={selectedProductForCustoms.id}
                    productName={selectedProductForCustoms.name}
                    open={customDialogOpen}
                    onClose={() => {
                        setCustomDialogOpen(false);
                        setSelectedProductForCustoms(null);
                        loadData(page, searchQuery || undefined, filterIndustry || undefined, filterCategory || undefined);
                    }}
                />
            )}

        </div>
    );
}
