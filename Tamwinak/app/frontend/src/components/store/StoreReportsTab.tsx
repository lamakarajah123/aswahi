import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, DollarSign, Star, TrendingUp } from 'lucide-react';
import type { SalesReport, StoreOrder } from '@/types';

interface Props {
  salesReport: SalesReport | null;
  reportOrders: StoreOrder[];
}

export function StoreReportsTab({ salesReport, reportOrders }: Props) {
  if (!salesReport) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No sales data yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{salesReport.total_orders}</p>
            <p className="text-xs text-gray-500">Completed Orders</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">₪{(Number(salesReport.total_revenue) || 0).toFixed(0)}</p>
            <p className="text-xs text-gray-500">Total Revenue</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">₪{(Number(salesReport.average_order) || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500">Avg Order</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{salesReport.store_rating || 'N/A'}</p>
            <p className="text-xs text-gray-500">Rating ({salesReport.total_ratings})</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Order Activity Log</h3>
          <Badge variant="outline" className="text-xs">
            Showing {reportOrders.length} records
          </Badge>
        </div>
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
                      No historical data available yet
                    </td>
                  </tr>
                ) : (
                  reportOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-blue-600">#{order.id}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            order.status === 'accepted'
                              ? 'bg-purple-100 text-purple-700 hover:bg-purple-100'
                              : order.status === 'delivered'
                              ? 'bg-green-100 text-green-700 hover:bg-green-100'
                              : order.status === 'rejected'
                              ? 'bg-red-100 text-red-700 hover:bg-red-100'
                              : order.status === 'cancelled'
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                          }
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        ₪{(Number(order.total) || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {(() => {
                          try {
                            return order.created_at
                              ? new Date(order.created_at).toLocaleDateString('en-US', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '---';
                          } catch {
                            return '---';
                          }
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
