const Response = require("../response");


const uploadImages = async (req, res) => {
    console.log("done")
    try {
        res.json({
            message: "Upload successful",
            image: req.file.buffer,     
            public_id: req.file.filename,
        });
    } catch (err) {
        console.error(err);
        return Response.serverError(res, err.message || "Upload failed");
    }
}

module.exports = { uploadImages }