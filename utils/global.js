const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

// 🔥 Upload single buffer
const uploadFromBuffer = (fileBuffer, folder = "products") => {
    return new Promise((resolve, reject) => {
        if (!fileBuffer) {
            return reject(new Error("File buffer is required"));
        }

        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "auto", // image/video dono handle karega
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve({
                    url: result.secure_url,
                    public_id: result.public_id
                });
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

// 🔥 Upload multiple files (BEST ADDITION 🚀)
const uploadMultiple = async (files, folder = "products") => {
    if (!files || files.length === 0) {
        throw new Error("No files provided");
    }

    const uploadPromises = files.map(file =>
        uploadFromBuffer(file.buffer, folder)
    );

    return Promise.all(uploadPromises);
};


const extractPublicId = (url) => {
    const parts = url.split("/");
    const fileName = parts.pop().split(".")[0];
    return `products/${fileName}`;
};


const removeMultiple = async (urls = []) => {
    const safeUrls = normalizeProductImages(urls);

    if (!safeUrls.length) {
        return [];
    }

    const deletePromises = safeUrls
        .map((url) => {
            const publicId = extractPublicId(url);
            if (!publicId) return null;

            return cloudinary.uploader.destroy(publicId);
        })
        .filter(Boolean);

    return Promise.all(deletePromises);
};

const normalizeProductImages = (imageUrl) => {
    let parsedImages = [];

    if (Array.isArray(imageUrl)) {
        parsedImages = imageUrl.filter(Boolean);
    }
    else if (typeof imageUrl === "string" && imageUrl.trim()) {
        const raw = imageUrl.trim();

        // PostgreSQL array format: {"url1","url2"}
        if (raw.startsWith("{") && raw.endsWith("}")) {
            const matches = [...raw.matchAll(/"(.*?)"/g)];
            parsedImages = matches.map(m => m[1]).filter(Boolean);

            // fallback
            if (!parsedImages.length) {
                parsedImages = raw
                    .slice(1, -1)
                    .split(",")
                    .map(item => item.replace(/^"+|"+$/g, "").trim())
                    .filter(Boolean);
            }
        }
        // JSON array string
        else if (raw.startsWith("[") && raw.endsWith("]")) {
            try {
                const parsed = JSON.parse(raw);
                parsedImages = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
            } catch (error) {
                parsedImages = [];
            }
        }
        // single URL
        else {
            parsedImages = [raw];
        }
    }

    return parsedImages;
};

const normalizeProductRecord = (product) => {
    if (!product) return null;

    const parsedImages = normalizeProductImages(product.image_url);
    const sold = product.actual_sold !== undefined ? Number(product.actual_sold) : Number(product.sold || 0);
    const revenue = product.actual_revenue !== undefined ? Number(product.actual_revenue) : 0;

    return {
        ...product,
        sold,
        revenue,
        image_url: parsedImages,
        images: parsedImages,
        img: parsedImages[0] || null,
    };
};

const normalizeProductRecords = (products = []) => {
    if (!Array.isArray(products)) return [];
    return products.map(normalizeProductRecord);
};

const parseBoolean = (value, def = false) => {
    if (value === undefined || value === null || value === "") return def;
    if (typeof value === "boolean") return value;
    return value.toString().toLowerCase() === "true";
};


const normalizeShiprocketPayload = (order, orderId, pickupLocation) => {
    const address = order.address || order;

    const splitName = (name = "") => {
        const parts = name.trim().split(/\s+/);

        return {
            first: parts[0] || "",
            last: parts.slice(1).join(" "),
        };
    };

    const billingName = splitName(address.name);

    const items = (order.order_items || []).map(item => ({
        ...item,

        // Shiprocket required fields
        name: item.title,
        sku: item.sku || item.id,
        units: Number(item.quantity || 1),
        selling_price: Number(item.selling_price || item.base_price || 0),
        discount: "",
        tax: Number(item.tax_percentage || 0),
        hsn: item.hsn || "",
    }));

    const isCOD = order.payment_method?.toLowerCase() === "cod";

    return {
        // Preserve complete original payload
        ...order,

        // Shiprocket fields
        order_id: String(orderId),
        order_date: new Date().toISOString()
            .slice(0, 16).replace("T", " "),
        pickup_location: pickupLocation,
        comment: order.notes || "",

        // Billing
        billing_customer_name: billingName.first,
        billing_last_name: billingName.last,
        billing_address: address.address_line_1 || "",
        billing_address_2: address.address_line_2 || "",
        billing_city: address.city || "",
        billing_pincode: Number(address.pincode),
        billing_state: address.state || "",
        billing_country: address.country || "India",
        billing_email: order.email || "",
        billing_phone: String(address.mobile || address.phone || "")
            .replace(/\D/g, ""),

        // Shipping
        shipping_is_billing: true,
        shipping_customer_name: billingName.first,
        shipping_last_name: billingName.last,
        shipping_address: address.address_line_1 || "",
        shipping_address_2: address.address_line_2 || "",
        shipping_city: address.city || "",
        shipping_pincode: Number(address.pincode),
        shipping_state: address.state || "",
        shipping_country: address.country || "India",
        shipping_email: order.email || "",
        shipping_phone: String(address.mobile || address.phone || "")
            .replace(/\D/g, ""),

        // Complete products + Shiprocket product fields
        order_items: items,

        payment_method: isCOD ? "COD" : "Prepaid",

        shipping_charges: Number(order.delivery_charge || 0),
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: Number(order.discount_amount || 0),
        sub_total: Number(order.subtotal_amount || 0),

        // Package details
        length: Math.max(
            1,
            ...(order.order_items || []).map(i => Number(i.length || 0))
        ),
        breadth: Math.max(
            1,
            ...(order.order_items || []).map(i => Number(i.width || 0))
        ),
        height: Math.max(
            1,
            ...(order.order_items || []).map(i => Number(i.height || 0))
        ),
        weight: (order.order_items || []).reduce(
            (sum, item) =>
                sum + Number(item.weight || 0) * Number(item.quantity || 1),
            0
        ) || 0.5,
    };
};


const generatePickupLocation = (address) => {
    const cleanAddress = (address || "Pickup")
        .trim()
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/\s+/g, " ");

    // Generate unique 6-character suffix
    const uniqueCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    // Maximum 36 characters
    const maxAddressLength = 36 - uniqueCode.length - 1;

    const shortAddress = cleanAddress.substring(
        0,
        maxAddressLength
    ).trim();

    return `${shortAddress} ${uniqueCode}`;
};




const prepareDelhiveryShipment = (data = {}) => {

    const address = data.address || data || {};
    const cartItems = Array.isArray(data.cart_items)
        ? data.cart_items
        : [];

    if (!cartItems.length) {
        throw new Error("Cart items are required");
    }

    // 1. Validate customer address
    const name = String(address.name || data.name || "").trim();

    const add = [
        address.address_line_1,
        address.address_line_2
    ]
        .filter(value => value != null && String(value).trim())
        .map(value => String(value).trim())
        .join(", ");

    const pin = String(address.pincode || "").trim();
    const city = String(address.city || "").trim();
    const state = String(address.state || "").trim();
    const country = String(address.country || "India").trim();

    const phone = String(
        address.phone || address.mobile || ""
    ).replace(/\D/g, "");

    if (!name || !add || !city || !state) {
        throw new Error("Delivery address details are incomplete");
    }

    if (!/^\d{6}$/.test(pin)) {
        throw new Error("Invalid delivery pincode");
    }

    if (phone.length < 10 || phone.length > 15) {
        throw new Error("Invalid customer phone number");
    }

    // 2. Validate payment method
    const paymentMethod = String(
        data.payment_method || ""
    ).trim().toLowerCase();

    if (!["cod", "card", "upi", "netbanking", "wallet"].includes(paymentMethod)) {
        throw new Error("Invalid payment method");
    }

    const payment_mode = paymentMethod === "cod"
        ? "COD"
        : "Pre-paid";



    const deliveryCharge = Number(
        data.delivery_charge?.shippingCharge ??
        data.delivery_charge ??
        0
    ) || 0;
    const subtotalAmount = Number(data.subtotal_amount);
    const discountAmount = Number(data.discount_amount || 0);
    const totalAmount = Number(data.total_amount);


    if (
        !Number.isFinite(deliveryCharge) ||
        deliveryCharge < 0 ||
        !Number.isFinite(subtotalAmount) ||
        subtotalAmount < 0 ||
        !Number.isFinite(discountAmount) ||
        discountAmount < 0 ||
        discountAmount > subtotalAmount ||
        !Number.isFinite(totalAmount) ||
        totalAmount < 0
    ) {
        throw new Error("Invalid order amount or delivery charge");
    }

    const toPaise = value => Math.round(value * 100);

    const deliveryPaise = toPaise(deliveryCharge);
    const subtotalPaise = toPaise(subtotalAmount);
    const discountPaise = toPaise(discountAmount);
    const totalPaise = toPaise(totalAmount);

    const expectedTotal =
        subtotalPaise - discountPaise + deliveryPaise;

    if (expectedTotal !== totalPaise) {
        throw new Error("Order total does not match payment details");
    }

    // 4. Allocate an amount proportionally without losing paise
    const allocateAmount = (amount, weights) => {
        const totalWeight = weights.reduce(
            (sum, weight) => sum + weight,
            0
        );

        if (!weights.length) return [];

        const effectiveWeights = totalWeight > 0
            ? weights
            : weights.map(() => 1);

        const effectiveTotal = effectiveWeights.reduce(
            (sum, weight) => sum + weight,
            0
        );

        const allocations = effectiveWeights.map(weight => {
            const exact = amount * weight / effectiveTotal;

            return {
                value: Math.floor(exact),
                remainder: exact - Math.floor(exact)
            };
        });

        let remaining = amount - allocations.reduce(
            (sum, item) => sum + item.value,
            0
        );

        const priority = allocations
            .map((item, index) => ({
                index,
                remainder: item.remainder
            }))
            .sort((a, b) => b.remainder - a.remainder);

        for (let i = 0; i < remaining; i++) {
            allocations[priority[i].index].value++;
        }

        return allocations.map(item => item.value);
    };

    // 5. Validate products and group by pickup location
    const groups = new Map();
    let calculatedSubtotal = 0;

    for (const item of cartItems) {
        const productId = item.product_id;

        const pickupLocation = String(
            item.delhivery_pickup_address_id || ""
        ).trim();

        const quantity = Number(item.quantity);
        const price = Number(item.price);

        if (!pickupLocation) {
            throw new Error(
                `Pickup location missing for product ${productId}`
            );
        }

        if (!productId) {
            throw new Error(
                "Product Id missing in cart item"
            );
        }

        if (
            !Number.isSafeInteger(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(price) ||
            price < 0
        ) {
            throw new Error("Invalid cart item details");
        }

        const productAmount = toPaise(price);

        if (!Number.isSafeInteger(productAmount)) {
            throw new Error("Invalid product amount");
        }

        calculatedSubtotal += productAmount;

        if (!groups.has(pickupLocation)) {
            groups.set(pickupLocation, {
                pickupLocation,
                items: [],
                productAmount: 0
            });
        }

        const group = groups.get(pickupLocation);

        group.items.push({
            item,
            quantity,
            productAmount,
            productId
        });

        group.productAmount += productAmount;
    }
    const sellerGroups = Array.from(groups.values());


    // 6. Verify cart subtotal
    if (calculatedSubtotal !== subtotalPaise) {
        throw new Error("Cart subtotal mismatch");
    }

    // 7. Allocate discount across individual products
    const allItems = sellerGroups.flatMap(group => group.items);

    const itemDiscounts = allocateAmount(
        discountPaise,
        allItems.map(entry => entry.productAmount)
    );

    allItems.forEach((entry, index) => {
        entry.discountAmount = itemDiscounts[index];
        entry.netAmount =
            entry.productAmount - entry.discountAmount;
    });

    // 8. Allocate shipping across seller groups
    const groupShipping = allocateAmount(
        deliveryPaise,
        sellerGroups.map(group =>
            group.items.reduce(
                (sum, entry) => sum + entry.netAmount,
                0
            )
        )
    );

    sellerGroups.forEach((group, index) => {
        group.shippingCharge = groupShipping[index];

        // Allocate each seller's shipping among its products
        const itemShipping = allocateAmount(
            group.shippingCharge,
            group.items.map(entry => entry.netAmount)
        );

        group.items.forEach((entry, itemIndex) => {
            entry.shippingCharge = itemShipping[itemIndex];
        });
    });

    // 9. Generate shipment payloads
    const orderNumber = `ORD-${Date.now()}`;
    const orderDate = new Date().toISOString().slice(0, 10);

    return sellerGroups.map(group => ({
        shipments: group.items.map(entry => {
            const shipmentTotal =
                entry.netAmount + entry.shippingCharge;

            const amount = shipmentTotal / 100;

            return {
                name,
                add,
                pin,
                city,
                state,
                country,
                phone,

                order: orderNumber,

                product_id: entry.productId,

                payment_mode,

                total_amount: amount,

                cod_amount: payment_mode === "COD"
                    ? amount
                    : 0,

                order_date: orderDate,

                quantity: entry.quantity,

                waybill: ""
            };
        }),

        pickup_location: {
            name: group.pickupLocation
        }
    }));

}






module.exports = {
    uploadFromBuffer,
    uploadMultiple,
    removeMultiple,
    normalizeProductImages,
    normalizeProductRecord,
    normalizeProductRecords,
    parseBoolean,
    normalizeShiprocketPayload,
    generatePickupLocation,
    prepareDelhiveryShipment
};