
const { User, Order } = require('./app/backend_node/src/models');
const { sequelize } = require('./app/backend_node/src/config/database');

async function check() {
  try {
    const drivers = await User.findAll({ where: { role: 'driver' } });
    console.log('Total Drivers:', drivers.length);
    for (const d of drivers) {
      const count = await Order.count({ where: { driver_id: d.id } });
      console.log(`Driver ${d.name || d.email} (${d.id}): ${count} orders`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
