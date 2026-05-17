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

    return {
        ...product,
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





module.exports = {
    uploadFromBuffer,
    uploadMultiple,
    removeMultiple,
    normalizeProductImages,
    normalizeProductRecord,
    normalizeProductRecords,
    parseBoolean,
};