'use client';

type StoreOrdersProps = { orders: any[] };

const SKU_NAMES: Record<string, string> = {
  'SKU-001': 'Honey Habanero Hot Sauce',
  'SKU-002': 'Hot Honey',
  'SKU-003': 'Jalapeno Lime Hot Sauce',
  'SKU-004': 'Mango Pineapple Habanero Hot Sauce',
};

function formatDate(value: any) {
  const date = value?.toDate?.();
  return date
    ? `${String(date.getDate()).padStart(2, '0')}-${date.toLocaleString('en-GB', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}`
    : 'Date unavailable';
}

export default function StoreOrders({ orders }: StoreOrdersProps) {
  if (orders.length === 0) {
    return <p style={styles.muted}>No orders recorded yet.</p>;
  }

  const sorted = [...orders].sort((a, b) => {
    const getTime = (order: any) => order.createdAt?.toDate?.()?.getTime?.() || order.orderDate?.toDate?.()?.getTime?.() || 0;
    return getTime(b) - getTime(a);
  });

  return (
    <div style={styles.list}>
      {sorted.slice(0, 10).map((order) => {
        const items = Array.isArray(order.items) ? order.items : Array.isArray(order.orderItems) ? order.orderItems : [];
        const total = Number(order.totalValue || order.orderValue || 0);

        return (
          <div key={order.id} style={styles.orderCard}>
            <div style={styles.orderHead}>
              <div>
                <strong>{formatDate(order.createdAt || order.orderDate)}</strong>
                <div style={styles.muted}>{order.orderNumber || order.id}</div>
              </div>
              <div style={styles.right}>
                <span style={styles.status}>{order.status || 'CAPTURED'}</span>
                <strong>KSh {total.toLocaleString()}</strong>
              </div>
            </div>

            {items.length > 0 ? (
              <div style={styles.items}>
                {items.map((item: any, index: number) => {
                  const sku = item.sku || item.skuId || item.productId || '';
                  const name = item.productName || item.name || SKU_NAMES[sku] || sku || 'Product';
                  const quantity = Number(item.quantity || item.qty || 0);
                  const unitPrice = Number(item.unitPrice || item.price || 0);
                  const lineTotal = Number(item.lineTotal || item.total || quantity * unitPrice);

                  return (
                    <div key={`${sku}-${index}`} style={styles.item}>
                      <span>{name}</span>
                      <span>{quantity} × KSh {unitPrice.toLocaleString()} = <strong>KSh {lineTotal.toLocaleString()}</strong></span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.muted}>Order items were not recorded for this order.</div>
            )}

            {order.notes && <div style={styles.notes}>{order.notes}</div>}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: 'grid', gap: 7, marginTop: 6 },
  orderCard: { padding: 9, background: '#fff', borderRadius: 8 },
  orderHead: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  right: { display: 'grid', justifyItems: 'end', gap: 3 },
  status: { padding: '3px 6px', borderRadius: 999, background: '#eef7ee', color: '#315d31', fontSize: 7, fontWeight: 900 },
  items: { marginTop: 7, borderTop: '1px solid #e5e3dd' },
  item: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: '1px solid #f0efec', fontSize: 9 },
  notes: { marginTop: 7, padding: 7, background: '#f7f7f4', borderRadius: 6, color: '#666', fontSize: 9 },
  muted: { color: '#888', fontSize: 9, margin: '4px 0 0' },
};
