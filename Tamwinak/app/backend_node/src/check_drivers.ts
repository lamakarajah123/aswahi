
import { User, Order } from './models';
import { sequelize } from './config/database';

async function check() {
  try {
    const drivers = await User.findAll({ where: { role: 'driver' } });
    console.log('Total Drivers:', drivers.length);
    for (const d of drivers) {
      const count = await Order.count({ where: { driver_id: d.id } });
      const deliveredCount = await Order.count({ where: { driver_id: d.id, status: 'delivered' } });
      console.log(`Driver ${d.name || d.email} (${d.id}): Total ${count}, Delivered ${deliveredCount}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
