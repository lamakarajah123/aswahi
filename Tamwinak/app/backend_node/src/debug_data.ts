
import { Order, User } from './models';
import { sequelize } from './config/database';

async function check() {
  try {
    const ordersWithDrivers = await Order.findAll({
      where: {
        driver_id: { [require('sequelize').Op.not]: null }
      },
      attributes: ['id', 'driver_id', 'status']
    });
    
    console.log(`Found ${ordersWithDrivers.length} orders with a driver assigned.`);
    ordersWithDrivers.forEach(o => {
      console.log(`Order #${o.id} -> DriverID: [${o.driver_id}], Status: ${o.status}`);
    });

    const drivers = await User.findAll({ where: { role: 'driver' }, attributes: ['id', 'name', 'email'] });
    console.log('\nList of Drivers in Users table:');
    drivers.forEach(d => {
      console.log(`Driver: ${d.name || d.email} -> ID: [${d.id}]`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
