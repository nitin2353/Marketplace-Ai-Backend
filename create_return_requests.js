const pool = require('./config/database');

async function createReturnRequestsTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS public.return_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES public.orders(id),
            order_item_id UUID NOT NULL REFERENCES public.order_items(id),
            product_id UUID NOT NULL REFERENCES public.products(id),
            variant_id UUID REFERENCES public.product_variants(id),
            customer_id UUID NOT NULL REFERENCES public.users(id),
            seller_id UUID NOT NULL REFERENCES public.users(id),
            request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('return', 'replacement')),
            reason TEXT NOT NULL,
            description TEXT,
            images TEXT[],
            status VARCHAR(30) DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'pickup_scheduled', 'received', 'refunded', 'replaced', 'cancelled')),
            seller_response TEXT,
            refund_amount NUMERIC DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `;

    try {
        await pool.query(query);
        console.log('✅ return_requests table created successfully');
    } catch (error) {
        console.error('❌ Error creating return_requests table:', error);
    } finally {
        process.exit();
    }
}

createReturnRequestsTable();
