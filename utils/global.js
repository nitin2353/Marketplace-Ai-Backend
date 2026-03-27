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
    if (!urls || urls.length === 0) {
        return []; // no error, just skip
    }

    const deletePromises = urls.map(url => {
        const publicId = extractPublicId(url);
        return cloudinary.uploader.destroy(publicId);
    });

    return Promise.all(deletePromises);
};


module.exports = {
    uploadFromBuffer,
    uploadMultiple,
    removeMultiple
};