const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const PASSWORD = 'Password123!';

// Seed these users with hashed passwords. Creates them if they don't exist.
const USERS = [
    { id: 'superadmin-1', email: 'superadmin@tamweenak.com', name: 'Ahmad Al-Rashid', role: 'super_admin' },
    { id: 'admin-1', email: 'admin@tamweenak.com', name: 'Fatima Al-Zahrani', role: 'admin' },
    { id: 'store-owner-1', email: 'store1@tamweenak.com', name: 'Khalid Al-Otaibi', role: 'store_owner' },
    { id: 'store-owner-2', email: 'store2@tamweenak.com', name: 'Noura Al-Dosari', role: 'store_owner' },
    { id: 'store-staff-1', email: 'staff1@tamweenak.com', name: 'Omar Al-Harbi', role: 'store_staff' },
    { id: 'store-staff-2', email: 'staff2@tamweenak.com', name: 'Layla Al-Qahtani', role: 'store_staff' },
    { id: 'driver-1', email: 'driver1@tamweenak.com', name: 'Saeed Al-Ghamdi', role: 'driver' },
    { id: 'driver-2', email: 'driver2@tamweenak.com', name: 'Youssef Al-Shehri', role: 'driver' },
    { id: 'driver-3', email: 'driver3@tamweenak.com', name: 'Hassan Al-Malki', role: 'driver' },
    { id: 'customer-1', email: 'customer1@tamweenak.com', name: 'Maryam Al-Subaie', role: 'customer' },
    { id: 'customer-2', email: 'customer2@tamweenak.com', name: 'Abdullah Al-Mutairi', role: 'customer' },
    { id: 'customer-3', email: 'customer3@tamweenak.com', name: 'Sara Al-Tamimi', role: 'customer' },
    { id: 'customer-4', email: 'customer4@tamweenak.com', name: 'Faisal Al-Dawsari', role: 'customer' },
    { id: 'customer-5', email: 'customer5@tamweenak.com', name: 'Huda Al-Juhani', role: 'customer' },
];

async function run() {
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    console.log(`Hashed password: ${passwordHash.slice(0, 20)}...`);

    const c = new Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();

    for (const u of USERS) {
        // Upsert: insert or update password_hash
        const res = await c.query(
            `INSERT INTO users (id, email, name, role, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         password_hash = EXCLUDED.password_hash`,
            [u.id, u.email, u.name, u.role, passwordHash]
        );
        console.log(`✅ Upserted: ${u.email} (${u.role})`);
    }

    await c.end();
    console.log(`\nDone! All users have password: ${PASSWORD}`);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
