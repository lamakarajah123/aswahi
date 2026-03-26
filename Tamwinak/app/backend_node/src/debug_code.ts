import { User, Order } from './models';
import { Op } from 'sequelize';
import { sequelize } from './config/database';

async function check() {
  const { count, rows: users } = await User.findAndCountAll({
      where: { role: 'driver', status: { [Op.in]: ['active', 'archived'] } },
      limit: 20,
      offset: 0,
  });

  const { QueryTypes } = require('sequelize');

  // Fetch aggregate counts for all drivers in one single query for performance and accuracy
  const stats = await sequelize.query(`
      SELECT 
          TRIM(CAST(driver_id AS TEXT)) as d_id, 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status ILIKE 'delivered' OR status ILIKE 'تم التوصيل' OR status ILIKE 'completed' OR status ILIKE 'done') as delivered_count
      FROM orders
      WHERE driver_id IS NOT NULL AND driver_id <> ''
      GROUP BY TRIM(CAST(driver_id AS TEXT))
  `, { type: QueryTypes.SELECT }) as any[];

  console.log("DB Stats object returned from query:", stats);

  const statsMap: Record<string, { total: number, delivered: number }> = {};
  stats.forEach(s => {
      statsMap[String(s.d_id).trim()] = {
          total: parseInt(s.total_count || '0'),
          delivered: parseInt(s.delivered_count || '0')
      };
  });

  console.log("Mapped stats:", statsMap);

  const data = users.map(u => {
      const userId = String(u.id).trim();
      const driverStats = statsMap[userId] || { total: 0, delivered: 0 };
      return {
          id: u.id,
          name: u.name,
          order_count: driverStats.total,
          delivered_count: driverStats.delivered
      };
  });

  console.log("Final data sent to frontend:", data);
  process.exit();
}

check();
