'use strict';
// ═══════════════════════════════════════════════════════════
// DATA MIGRATION: cr4_store (old) → new relational tables
// ═══════════════════════════════════════════════════════════

async function checkMigrationNeeded() {
  // Check if new tables have data
  const customers = await dbSelect('customers', 'select=id&limit=1');
  if (customers && customers.length > 0) {
    console.log('Migration: Already migrated, setting db_migrated flag');
    cacheSet('db_migrated', true);
    return 'already_done';
  }
  // Check if old data exists
  const oldStops = legacyGet('stops', null);
  if (!oldStops || oldStops.length === 0) {
    console.log('Migration: No old data found');
    return false;
  }
  return true;
}

async function runMigration() {
  const statusEl = document.getElementById('migration-status');
  const log = (msg) => {
    console.log('Migration:', msg);
    if (statusEl) statusEl.textContent = msg;
  };

  log('Göç başlıyor...');

  try {
    // 1. Migrate customers (STOPS)
    const stops = legacyGet('stops', []);
    const geo = legacyGet('geo', {});
    const cnotes = legacyGet('cnotes', {});

    if (stops.length > 0) {
      log(`${stops.length} müşteri aktarılıyor...`);
      const customerRows = stops.map(s => ({
        id: s.id,
        name: s.n,
        address: s.a || '',
        city: s.c || '',
        postcode: s.p || '',
        lat: geo[s.id]?.lat || null,
        lng: geo[s.id]?.lng || null,
        note: cnotes[s.id] || ''
      }));
      // Batch insert (Supabase REST supports arrays)
      await dbInsert('customers', customerRows, { upsert: true });
    }

    // 2. Migrate catalog → products
    const catalog = legacyGet('catalog', []);
    if (catalog.length > 0) {
      log(`${catalog.length} ürün aktarılıyor...`);
      const productRows = catalog.map((c, i) => ({
        name: c.name,
        unit: c.unit || '1',
        price: c.price || 0,
        stock: c.stock ?? null,
        track_stock: c.trackStock !== false,
        sort_order: i
      }));
      await dbInsert('products', productRows, { upsert: true });
    }

    // 3. Migrate assignments
    const assign = legacyGet('assign', {});
    const assignEntries = Object.entries(assign).filter(([, v]) => v);
    if (assignEntries.length > 0) {
      log(`${assignEntries.length} gün ataması aktarılıyor...`);
      const assignRows = assignEntries.map(([cid, dayId]) => ({
        customer_id: parseInt(cid),
        day_id: dayId
      }));
      await dbInsert('assignments', assignRows, { upsert: true });
    }

    // 4. Migrate route order
    const routeOrder = legacyGet('routeOrder', {});
    const roEntries = Object.entries(routeOrder);
    if (roEntries.length > 0) {
      log('Rota sıralaması aktarılıyor...');
      const roRows = [];
      roEntries.forEach(([dayId, cids]) => {
        if (Array.isArray(cids)) {
          cids.forEach((cid, i) => {
            roRows.push({ day_id: dayId, customer_id: cid, position: i });
          });
        }
      });
      if (roRows.length > 0) {
        await dbInsert('route_order', roRows, { upsert: true });
      }
    }

    // 5. Migrate orders + order items
    const ordersV2 = legacyGet('ordersV2', {});
    const orderEntries = Object.values(ordersV2);
    if (orderEntries.length > 0) {
      log(`${orderEntries.length} sipariş aktarılıyor...`);

      // Insert orders in batches of 50
      const batchSize = 50;
      for (let i = 0; i < orderEntries.length; i += batchSize) {
        const batch = orderEntries.slice(i, i + batchSize);
        const orderRows = batch.map(o => ({
          id: o.id,
          customer_id: o.customerId,
          status: o.status || 'pending',
          pay_method: o.payMethod || null,
          cash_paid: o.cashPaid ?? null,
          delivery_date: o.deliveryDate || null,
          note: o.note || '',
          created_at: o.createdAt || new Date().toISOString(),
          delivered_at: o.deliveredAt || null
        }));
        await dbInsert('orders', orderRows, { upsert: true });

        // Insert order items
        const itemRows = [];
        batch.forEach(o => {
          if (o.items && o.items.length > 0) {
            o.items.forEach(item => {
              itemRows.push({
                order_id: o.id,
                product_name: item.name,
                qty: item.qty,
                price: item.price
              });
            });
          }
        });
        if (itemRows.length > 0) {
          await dbInsert('order_items', itemRows);
        }

        log(`Siparişler: ${Math.min(i + batchSize, orderEntries.length)}/${orderEntries.length}`);
      }
    }

    // 6. Migrate debts
    const debts = legacyGet('debts', {});
    const debtEntries = Object.entries(debts).filter(([, v]) => v != null);
    if (debtEntries.length > 0) {
      log(`${debtEntries.length} borç kaydı aktarılıyor...`);
      const debtRows = debtEntries.map(([cid, amount]) => ({
        customer_id: parseInt(cid),
        amount: amount || 0
      }));
      await dbInsert('debts', debtRows, { upsert: true });
    }

    // 7. Migrate debt history
    const debtHistory = legacyGet('debtHistory', {});
    const dhEntries = Object.entries(debtHistory);
    if (dhEntries.length > 0) {
      log('Borç geçmişi aktarılıyor...');
      const dhRows = [];
      dhEntries.forEach(([cid, entries]) => {
        if (Array.isArray(entries)) {
          entries.forEach(e => {
            dhRows.push({
              customer_id: parseInt(cid),
              amount: e.amount || 0,
              note: e.note || '',
              order_id: e.orderId || null,
              created_at: e.date || new Date().toISOString()
            });
          });
        }
      });
      if (dhRows.length > 0) {
        // Batch insert
        for (let i = 0; i < dhRows.length; i += 100) {
          await dbInsert('debt_history', dhRows.slice(i, i + 100));
        }
      }
    }

    // 8. Migrate customer pricing
    const pricing = legacyGet('customerPricing', null) || legacyGet('stopCatalog', {});
    if (pricing && Object.keys(pricing).length > 0) {
      log('Müşteri fiyatları aktarılıyor...');
      const pRows = [];
      Object.entries(pricing).forEach(([cid, products]) => {
        if (products && typeof products === 'object') {
          Object.entries(products).forEach(([name, price]) => {
            if (price != null) {
              pRows.push({
                customer_id: parseInt(cid),
                product_name: name,
                price
              });
            }
          });
        }
      });
      if (pRows.length > 0) {
        await dbInsert('customer_pricing', pRows, { upsert: true });
      }
    }

    // 9. Migrate recurring orders
    const recurring = legacyGet('recurringOrders', {});
    const recEntries = Object.entries(recurring);
    if (recEntries.length > 0) {
      log('Tekrarlayan siparişler aktarılıyor...');
      const recRows = recEntries.map(([cid, data]) => ({
        customer_id: parseInt(cid),
        items: data.items || [],
        note: data.note || ''
      }));
      await dbInsert('recurring_orders', recRows, { upsert: true });
    }

    // 10. Migrate locked orders setting
    const lockedOrders = legacyGet('ordersLockedOrders', []);
    if (lockedOrders.length > 0) {
      await dbUpsert('app_settings', {
        key: 'ordersLockedOrders',
        value: lockedOrders,
        updated_at: new Date().toISOString()
      });
    }

    // Record migration
    await dbInsert('migrations', { name: 'cr4_to_v2' });

    // Sync all into new cache
    await syncAll();

    log('Göç tamamlandı!');
    return true;

  } catch (e) {
    log('Göç hatası: ' + e.message);
    console.error('Migration error:', e);
    return false;
  }
}
