import { User } from './src/models';
import { connectDB } from './src/config/database';

async function run() {
    await connectDB();
    const users = await User.findAll({ limit: 5 });
    console.log('Sample Users:', users.map(u => ({ email: u.email, name: u.name || 'N/A' })));
}
run();
