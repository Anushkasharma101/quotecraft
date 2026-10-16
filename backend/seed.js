import { connectDatabase } from './db.js';
let connection;
try {
    connection = await connectDatabase(); let { repo, db } = connection;
    // Atomic seed lock prevents accidental duplicate sample data from repeated runs.
    let lock = await db.collection('seeds').updateOne({ _id: 'sample-v1' }, { $setOnInsert: { startedAt: new Date() } }, { upsert: true });
    if (!lock.upsertedCount) { console.log('Sample seed has already run. Existing records were kept.'); }
    else { for (const p of [{ name: 'Handwoven wool carpet', detail: 'Beige · 6 × 9 ft', price: 12500 }, { name: 'Flatweave cotton rug', detail: 'Ivory · 4 × 6 ft', price: 4800 }, { name: 'Custom wool carpet', detail: 'Made to order · 8 × 10 ft', price: 18000 }]) await repo.insert('products', p); await repo.insert('customers', { name: 'Priya Mehta', email: 'priya@example.com', phone: '', address: 'Jaipur, Rajasthan' }); console.log('Sample catalogue and customer created.'); }
} catch (error) {
    console.error('MongoDB error:', error.message);
    process.exitCode = 1;
}
finally {
    await connection?.client.close();
}
