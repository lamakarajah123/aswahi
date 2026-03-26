import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield, Store, Package, DollarSign, Users,
  Check, X, TrendingUp, Settings, LogIn, Clock, Edit, Trash2, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import type { Analytics, AdminUser, AdminStore, AdminOrder, AppSetting } from './admin/types';
import type { Product } from '@/types';

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSettings, setEditingSettings] = useState<Record<number, string>>({});

  const STANDARD_CATEGORIES = ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Seafood', 'Bakery', 'Beverages', 'Pantry', 'Snacks', 'Frozen'];

  const dynamicCategories = useMemo(() => {
    const customCats = products
      .map(p => p.category)
      .filter((cat): cat is string => !!cat && !STANDARD_CATEGORIES.includes(cat) && cat !== 'Other');
    return [...STANDARD_CATEGORIES, ...Array.from(new Set(customCats))];
  }, [products]);

  const [productDialog, setProductDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    store_id: '', name: '', description: '', price: '', category: 'Fruits', unit: 'each', stock_quantity: '', image_url: '',
  });
  const [customCategory, setCustomCategory] = useState('');

  const [storeDialog, setStoreDialog] = useState(false);
  const [storeForm, setStoreForm] = useState({
    store_name: '', description: '', address: '', phone: '', image_url: '', latitude: '32.2211', longitude: '35.2544',
    owner_name: '', email: '', password: ''
  });

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
  const openConfirm = (message: string, onConfirm: () => void) => setConfirmDialog({ open: true, message, onConfirm });

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const [analyticsRes, storesRes, ordersRes, settingsRes, usersRes, driversRes, productsRes] = await Promise.all([
        apiCall.invoke({ url: '/api/v1/grocery/admin/analytics', method: 'GET', signal }),
        apiCall.invoke({ url: '/api/v1/grocery/admin/stores', method: 'GET', signal }),
        apiCall.invoke({ url: '/api/v1/grocery/admin/orders', method: 'GET', signal }),
        apiCall.invoke({ url: '/api/v1/grocery/admin/settings', method: 'GET', signal }),
        apiCall.invoke({ url: '/api/v1/users/pending', method: 'GET', signal }),
        apiCall.invoke({ url: '/api/v1/users/drivers', method: 'GET', signal }),
        apiCall.invoke({ url: '/api/v1/entities/products?skip=0&limit=50', method: 'GET', signal }),
      ]);
      setAnalytics(analyticsRes.data);
      setStores(storesRes.data?.data || []);
      setOrders(ordersRes.data?.items || []);
      setSettings(settingsRes.data || []);
      setPendingUsers(usersRes.data?.data || []);
      setActiveDrivers(driversRes.data?.data || []);
      setProducts(productsRes.data?.items || productsRes.data?.data || (Array.isArray(productsRes.data) ? productsRes.data : []));
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user && !authLoading) return;
    if (!user) return;
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [user, authLoading, loadData]);

  const approveStore = async (storeId: number) => {
    try {
      await apiCall.invoke({
        url: `/api/v1/grocery/admin/stores/${storeId}/approve`,
        method: 'PUT',
      });
      toast.success('Store approved');
      loadData();
    } catch {
      toast.error('Failed to approve store');
    }
  };

  const rejectStore = async (storeId: number) => {
    try {
      await apiCall.invoke({
        url: `/api/v1/grocery/admin/stores/${storeId}/reject`,
        method: 'PUT',
      });
      toast.success('Store rejected');
      loadData();
    } catch {
      toast.error('Failed to reject store');
    }
  };

  const archiveStore = (storeId: number) => {
    openConfirm(
      "Are you sure you want to archive this store? The store owner will no longer be able to log in.",
      async () => {
        try {
          await apiCall.invoke({ url: `/api/v1/grocery/admin/stores/${storeId}/archive`, method: 'PUT' });
          toast.success('Store archived');
          loadData();
        } catch { toast.error('Failed to archive store'); }
      }
    );
  };

  const handleSaveStore = async () => {
    try {
      if (!storeForm.store_name || !storeForm.address || !storeForm.email || !storeForm.password) {
        toast.error('Store name, address, email, and password are required');
        return;
      }

      const payload = {
        store_name: storeForm.store_name,
        description: storeForm.description || null,
        address: storeForm.address,
        phone: storeForm.phone || null,
        image_url: storeForm.image_url || null,
        latitude: parseFloat(storeForm.latitude) || 32.2211,
        longitude: parseFloat(storeForm.longitude) || 35.2544,
        email: storeForm.email,
        password: storeForm.password,
        owner_name: storeForm.owner_name || null,
      };

      await apiCall.invoke({
        url: '/api/v1/grocery/admin/stores/with-owner',
        method: 'POST',
        data: payload,
      });

      toast.success('Store owner account and store created!');
      setStoreDialog(false);
      loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail?.[0]?.message || e?.response?.data?.detail || e?.message || 'Failed to save store');
    }
  };

  const handleStoreImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreForm({ ...storeForm, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm({ ...productForm, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async () => {
    try {
      const finalCategory = productForm.category === 'Other' ? customCategory : productForm.category;

      if (productForm.category === 'Other' && !finalCategory.trim()) {
        toast.error('Please specify the custom category');
        return;
      }

      const data = {
        store_id: parseInt(productForm.store_id),
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: finalCategory,
        unit: productForm.unit,
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        is_available: true,
        image_url: productForm.image_url || '',
      };

      if (!data.store_id || isNaN(data.store_id)) {
        toast.error('Please select a store');
        return;
      }

      if (editProduct) {
        await apiCall.invoke({
          url: `/api/v1/entities/products/${editProduct.id}`,
          method: 'PUT',
          data,
        });
      } else {
        await apiCall.invoke({
          url: '/api/v1/entities/products',
          method: 'POST',
          data,
        });
      }
      toast.success(editProduct ? 'Product updated!' : 'Product added!');
      setProductDialog(false);
      setEditProduct(null);
      setProductForm({ store_id: '', name: '', description: '', price: '', category: 'Fruits', unit: 'each', stock_quantity: '', image_url: '' });
      setCustomCategory('');
      loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail?.[0]?.message || e?.response?.data?.detail || e?.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await apiCall.invoke({
        url: `/api/v1/entities/products/${id}`,
        method: 'DELETE',
      });
      toast.success('Product deleted');
      loadData();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const openEditProduct = (p: Product) => {
    const isStandardCategory = dynamicCategories.includes(p.category || '');

    setEditProduct(p);
    setProductForm({
      store_id: String(p.store_id),
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      category: isStandardCategory ? (p.category || 'Fruits') : 'Other',
      unit: p.unit || 'each',
      stock_quantity: String(p.stock_quantity || 0),
      image_url: p.image_url || '',
    });
    setCustomCategory(isStandardCategory ? '' : (p.category || ''));
    setProductDialog(true);
  };


  const approveUser = async (userId: string) => {
    try {
      await apiCall.invoke({
        url: `/api/v1/users/${userId}/approve`,
        method: 'PUT',
      });
      toast.success('User approved');
      loadData();
    } catch {
      toast.error('Failed to approve user');
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      await apiCall.invoke({
        url: `/api/v1/users/${userId}/reject`,
        method: 'PUT',
      });
      toast.success('User rejected');
      loadData();
    } catch {
      toast.error('Failed to reject user');
    }
  };

  const archiveUser = (userId: string) => {
    openConfirm(
      "Are you sure you want to archive this user? They will no longer be able to log in.",
      async () => {
        try {
          await apiCall.invoke({ url: `/api/v1/users/${userId}/archive`, method: 'PUT' });
          toast.success('User archived');
          loadData();
        } catch { toast.error('Failed to archive user'); }
      }
    );
  };

  const unarchiveUser = (userId: string) => {
    openConfirm(
      "Are you sure you want to unarchive this user?",
      async () => {
        try {
          await apiCall.invoke({ url: `/api/v1/users/${userId}/unarchive`, method: 'PUT' });
          toast.success('User unarchived');
          loadData();
        } catch { toast.error('Failed to unarchive user'); }
      }
    );
  };

  const unarchiveStore = (storeId: number) => {
    openConfirm(
      "Are you sure you want to unarchive this store and its owner?",
      async () => {
        try {
          await apiCall.invoke({ url: `/api/v1/grocery/admin/stores/${storeId}/unarchive`, method: 'PUT' });
          toast.success('Store unarchived');
          loadData();
        } catch { toast.error('Failed to unarchive store'); }
      }
    );
  };

  const updateSetting = async (settingId: number) => {
    const newValue = editingSettings[settingId];
    if (!newValue) return;
    try {
      await apiCall.invoke({
        url: `/api/v1/grocery/admin/settings/${settingId}`,
        method: 'PUT',
        data: { value: newValue },
      });
      toast.success('Setting updated');
      setEditingSettings((prev) => {
        const copy = { ...prev };
        delete copy[settingId];
        return copy;
      });
      loadData();
    } catch {
      toast.error('Failed to update setting');
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center p-8">
          <LogIn className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
          <p className="text-gray-500 mb-4">Please sign in to access the admin panel</p>
          <Button onClick={() => navigate('/login')} className="bg-green-600 hover:bg-green-700 text-white">Sign In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Analytics Cards */}
        {analytics ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <Card className="border-0 shadow-sm bg-blue-50/30">
              <CardContent className="p-4 text-center">
                <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{analytics.total_orders || 0}</p>
                <p className="text-[10px] text-gray-500 font-medium">Total Orders</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-green-50/30">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-600">₪{(Number(analytics.total_revenue) || 0).toFixed(0)}</p>
                <p className="text-[10px] text-gray-500 font-medium">Delivered Revenue</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-orange-50/30">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-orange-600">₪{(Number(analytics.gross_order_value) || 0).toFixed(0)}</p>
                <p className="text-[10px] text-gray-500 font-medium">Gross Order Value</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Store className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{analytics.total_stores || 0}</p>
                <p className="text-[10px] text-gray-500 font-medium">Total Stores</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{analytics.pending_approvals || 0}</p>
                <p className="text-[10px] text-gray-500 font-medium">Pending</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-cyan-50/30">
              <CardContent className="p-4 text-center">
                <Users className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-cyan-600">{analytics.active_drivers || 0}</p>
                <p className="text-[10px] text-gray-500 font-medium">Active Drivers</p>
              </CardContent>
            </Card>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="border-0 shadow-sm animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 w-4 bg-gray-200 rounded mx-auto mb-2" />
                  <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1" />
                  <div className="h-3 w-16 bg-gray-100 rounded mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        <Tabs defaultValue="stores" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="stores">Stores</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Pending</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="space-y-4 pt-8">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading admin data...</p>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Stores Tab */}
              <TabsContent value="stores" className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Stores Overview</h3>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setStoreForm({ store_name: '', description: '', address: '', phone: '', image_url: '', latitude: '32.2211', longitude: '35.2544', owner_name: '', email: '', password: '' }); setStoreDialog(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Add Store
                  </Button>
                </div>
                {stores.length === 0 ? (
                  <div className="text-center py-12">
                    <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No stores registered</p>
                  </div>
                ) : (
                  stores.map((store) => (
                    <Card key={store.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{store.name}</h3>
                              {!store.is_active && (
                                <Badge className="bg-red-100 text-red-700 text-xs">Archived</Badge>
                              )}
                              {store.is_active && store.is_approved ? (
                                <Badge className="bg-green-100 text-green-700 text-xs">Approved</Badge>
                              ) : store.is_active && !store.is_approved ? (
                                <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{store.address}</p>
                            <p className="text-xs text-gray-400">Owner Email: {store.owner_email || `${store.user_id.substring(0, 8)}...`}</p>
                          </div>
                          <div className="flex gap-2">
                            {!store.is_approved && (
                              <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approveStore(store.id)}>
                                  <Check className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => rejectStore(store.id)}>
                                  <X className="w-3 h-3 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {store.is_active && (
                              <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 border-red-200" onClick={() => archiveStore(store.id)}>
                                Archive
                              </Button>
                            )}
                            {!store.is_active && (
                              <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 border-green-200" onClick={() => unarchiveStore(store.id)}>
                                Unarchive
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Platform Products</h3>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setEditProduct(null); setProductForm({ store_id: '', name: '', description: '', price: '', category: 'Fruits', unit: 'each', stock_quantity: '', image_url: '' }); setProductDialog(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Add Product
                  </Button>
                </div>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No products registered on the platform</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-2 pr-4">Image</th>
                          <th className="pb-2 pr-4">Name</th>
                          <th className="pb-2 pr-4">Store</th>
                          <th className="pb-2 pr-4">Price</th>
                          <th className="pb-2 pr-4">Category</th>
                          <th className="pb-2 pr-4">Stock</th>
                          <th className="pb-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => {
                          const store = stores.find(s => s.id === p.store_id);
                          return (
                            <tr key={p.id} className="border-b last:border-0">
                              <td className="py-2 pr-4">
                                {p.image_url ? (
                                  <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded" loading="lazy" width={40} height={40} />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded text-gray-400">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                              </td>
                              <td className="py-3 pr-4 font-medium">{p.name}</td>
                              <td className="py-3 pr-4 text-gray-600">{store?.name || `Store #${p.store_id}`}</td>
                              <td className="py-3 pr-4">₪{p.price.toFixed(2)}</td>
                              <td className="py-3 pr-4"><Badge variant="outline" className="text-xs">{p.category}</Badge></td>
                              <td className="py-3 pr-4">{p.stock_quantity}</td>
                              <td className="py-3">
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEditProduct(p)}>
                                    <Edit className="w-4 h-4 text-blue-500" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleDeleteProduct(p.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
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
              </TabsContent>

              {/* Pending Users Tab */}
              <TabsContent value="users" className="space-y-3">
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pending users awaiting approval.</p>
                  </div>
                ) : (
                  pendingUsers.map((pUser) => (
                    <Card key={pUser.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{pUser.name || 'No Name'}</h3>
                              <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>
                              <Badge variant="outline" className="text-xs uppercase">{pUser.role}</Badge>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">{pUser.email} {pUser.phone && `• ${pUser.phone}`}</p>

                            {pUser.role === 'driver' && (
                              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded">
                                <p><span className="font-medium text-gray-700">Area:</span> {pUser.work_area || 'N/A'}</p>
                                <p><span className="font-medium text-gray-700">Vehicle:</span> {pUser.vehicle_type || 'N/A'}</p>
                                <p><span className="font-medium text-gray-700">Hours:</span> {pUser.working_hours || 'N/A'}</p>
                                <p><span className="font-medium text-gray-700">Address:</span> {pUser.address || 'N/A'}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approveUser(pUser.id)}>
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => rejectUser(pUser.id)}>
                              <X className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Active Drivers Tab */}
              <TabsContent value="drivers" className="space-y-3">
                {activeDrivers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No active drivers found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeDrivers.map((driver) => (
                      <Card key={driver.id} className={`border-0 shadow-sm border-t-4 ${driver.status === 'archived' ? 'border-t-gray-400 bg-gray-50' : 'border-t-green-500'} relative`}>
                        {driver.status === 'archived' ? (
                          <Button
                            variant="ghost" size="sm"
                            className="absolute top-2 right-2 text-green-600 hover:text-green-700 hover:bg-green-50 h-8 text-xs font-semibold"
                            onClick={() => unarchiveUser(driver.id)}
                          >
                            Unarchive
                          </Button>
                        ) : (
                          <Button
                            variant="ghost" size="sm"
                            className="absolute top-2 right-2 text-red-500 hover:text-red-600 hover:bg-red-50 h-8 text-xs font-semibold"
                            onClick={() => archiveUser(driver.id)}
                          >
                            Archive
                          </Button>
                        )}
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2 pr-16">
                            {driver.name || 'Unnamed Driver'}
                            {driver.status === 'archived' ? (
                              <Badge className="bg-gray-200 text-gray-700">Archived</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700">Active</Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-gray-500">{driver.email}</p>
                          {driver.phone && <p className="text-sm text-gray-600 font-medium">{driver.phone}</p>}
                        </CardHeader>
                        <CardContent className="text-sm">
                          <div className="grid grid-cols-2 gap-y-2 mb-3">
                            <div>
                              <p className="text-xs text-gray-400">Work Area</p>
                              <p className="font-medium">{driver.work_area || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Vehicle Type</p>
                              <p className="font-medium capitalize">{driver.vehicle_type || '-'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-400">Working Hours</p>
                              <p className="font-medium">{driver.working_hours || '-'}</p>
                            </div>
                            {driver.address && (
                              <div className="col-span-2 mt-1">
                                <p className="text-xs text-gray-400">Address</p>
                                <p className="font-medium">{driver.address}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-3">
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No orders yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-2 pr-4">ID</th>
                          <th className="pb-2 pr-4">Store</th>
                          <th className="pb-2 pr-4">Status</th>
                          <th className="pb-2 pr-4">Total</th>
                          <th className="pb-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 font-medium">#{order.id}</td>
                            <td className="py-3 pr-4">{order.store_name}</td>
                            <td className="py-3 pr-4">
                              <Badge variant="secondary" className="text-xs">{order.status}</Badge>
                            </td>
                            <td className="py-3 pr-4 font-semibold text-green-600">₪{order.total.toFixed(2)}</td>
                            <td className="py-3 text-gray-400 text-xs">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Analytics Tab (Reports) */}
              <TabsContent value="analytics">
                {analytics && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">Business Intelligence Reports</h3>
                      <Button variant="outline" size="sm" onClick={() => window.print()} className="bg-white">
                        <Package className="w-4 h-4 mr-2" /> Download Summary Report
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" /> Revenue Distribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                              <span className="text-sm font-medium text-green-800">Completed (Delivered) Revenue</span>
                              <span className="text-lg font-bold text-green-700">₪{(Number(analytics.total_revenue) || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                              <span className="text-sm font-medium text-gray-600">Total Order Volume (Gross)</span>
                              <span className="text-lg font-bold text-gray-700">₪{(Number(analytics.gross_order_value) || 0).toLocaleString()}</span>
                            </div>
                            <div className="pt-2 border-t text-[10px] text-gray-400">
                              * Gross order value includes all pending, cancelled, and rejected orders.
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Check className="w-4 h-4 text-purple-500" /> Order Fulfillment Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            {analytics.orders_by_status && Object.entries(analytics.orders_by_status).map(([status, count]) => (
                              <div key={status} className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-400 capitalize">{status.replace('_', ' ')}</p>
                                <p className="text-lg font-bold text-gray-700">{count}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="border-0 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold">Recent System Activity</CardTitle>
                        <Badge variant="outline" className="text-[10px] font-normal">Last 10 Orders</Badge>
                      </CardHeader>
                      <CardContent>
                        {(!analytics.recent_orders || analytics.recent_orders.length === 0) ? (
                          <div className="text-center py-6 text-gray-400 text-sm italic">No recent system activity recorded</div>
                        ) : (
                          <div className="divide-y">
                            {analytics.recent_orders.map((order) => (
                              <div key={order.id} className="flex items-center justify-between py-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-bold text-sm text-gray-800">Order #{order.id}</p>
                                    <Badge className="text-[9px] h-4 px-1.5">{order.status}</Badge>
                                  </div>
                                  <p className="text-xs text-gray-500">{order.store_name} • {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-green-600">₪{(Number(order.total) || 0).toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-3">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="w-5 h-5" /> Platform Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {settings.map((setting) => (
                      <div key={setting.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{setting.description || setting.key}</p>
                          <p className="text-xs text-gray-400">{setting.key}</p>
                        </div>
                        <Input
                          className="w-32"
                          value={editingSettings[setting.id] ?? setting.value}
                          onChange={(e) => setEditingSettings({ ...editingSettings, [setting.id]: e.target.value })}
                        />
                        {editingSettings[setting.id] !== undefined && editingSettings[setting.id] !== setting.value && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateSetting(setting.id)}>
                            Save
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Store Dialog for Admin */}
      <Dialog open={storeDialog} onOpenChange={setStoreDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Store & Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Owner Account Details</h4>
              <Input placeholder="Owner Name" value={storeForm.owner_name} onChange={(e) => setStoreForm({ ...storeForm, owner_name: e.target.value })} />
              <Input type="email" placeholder="Owner Email *" value={storeForm.email} onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })} />
              <Input type="password" placeholder="Owner Password *" value={storeForm.password} onChange={(e) => setStoreForm({ ...storeForm, password: e.target.value })} />
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Store Details</h4>
              <Input placeholder="Store Name *" value={storeForm.store_name} onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })} />
              <Textarea placeholder="Store Description" value={storeForm.description} onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })} rows={2} />
              <Input placeholder="Phone Number" value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Store Address *</label>
                <Input placeholder="Full Address" value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Latitude</label>
                  <Input placeholder="Lat" value={storeForm.latitude} onChange={(e) => setStoreForm({ ...storeForm, latitude: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Longitude</label>
                  <Input placeholder="Lng" value={storeForm.longitude} onChange={(e) => setStoreForm({ ...storeForm, longitude: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Store Image</label>
                <Input type="file" accept="image/*" onChange={handleStoreImageUpload} />
                {storeForm.image_url && (
                  <img src={storeForm.image_url} alt="Store Preview" className="mt-2 h-20 w-20 object-cover rounded" loading="lazy" width={80} height={80} />
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setStoreDialog(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveStore}>Create Store</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog for Admin */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Store *</p>
              <Select value={productForm.store_id} onValueChange={(v) => setProductForm({ ...productForm, store_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Store" /></SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input placeholder="Product name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            <Textarea placeholder="Description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
              <Input type="number" placeholder="Stock" value={productForm.stock_quantity} onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other...</SelectItem>
                  </SelectContent>
                </Select>
                {productForm.category === 'Other' && (
                  <Input
                    placeholder="Enter custom category"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
              <Input placeholder="Unit (kg, each, etc)" value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Product Image (URL or Base64)</p>
              <Input type="file" accept="image/*" onChange={handleProductImageUpload} />
              {productForm.image_url && (
                <img src={productForm.image_url} alt="Preview" className="h-20 object-cover rounded mt-2 border" loading="lazy" width={128} height={80} />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveProduct}>
              {editProduct ? 'Update' : 'Add'} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(s => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(s => ({ ...s, open: false })); }} className="bg-red-600 hover:bg-red-700">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
