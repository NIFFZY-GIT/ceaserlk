import { db } from './src/lib/db';
import { ensureDeliveryIdSchema } from './src/lib/delivery-id';

(async () => {
  try {
    console.log('🔄 Running delivery_id migration...');
    await ensureDeliveryIdSchema(db);
    console.log('✅ Migration completed successfully!');
    console.log('📝 Column delivery_id has been added to orders table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
})();
