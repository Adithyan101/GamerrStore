const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")

const getBrandPage = async(req,res)=>{
    try {
        //pagination:
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip =  (page-1)*limit;
        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit)
        const totalBrands = await Brand.countDocuments()
        const totalPages = Math.ceil(totalBrands/limit);
        const reverseBrand = brandData.reverse();
        res.render("brands",{
            data:reverseBrand,
            currentPage:page,
            totalPages:totalPages,
            totalBrands:totalBrands
        })

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const addBrand = async (req, res) => {
    try {
        const brand = req.body.name;

        // Check if the brand already exists (case-insensitive)
        const existingBrand = await Brand.findOne({ brandName: { $regex: `^${brand}$`, $options: 'i' } });
        if (existingBrand) {
            return res.status(400).json({ error: 'Brand name already exists. Please choose another one.' });
        }

        // Prepare image handling: If no image is uploaded, don't add the image field
        let image = null;
        if (req.file && req.file.filename) {
            image = req.file.filename;
        }

        // Create a new brand with the provided name and image (if available)
        const newBrand = new Brand({
            brandName: brand,
            brandImage: image,
        });

        // Save the brand to the database
        await newBrand.save();

        // Redirect to the brands list page after successful creation
        res.redirect("/admin/brands");
    } catch (error) {
        console.log("Error in adding brand:", error.message);
        res.redirect("/pageerror");
    }
};


const blockBrand = async(req,res)=>{
    try {

        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/brands")

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const unblockBrand = async(req,res)=>{
    try {

        const id = req.query.id
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/brands")

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const deleteBrand = async(req,res)=>{
    try {

        const {id} = req.query
        if(!id){
            return res.status(400).redirect("/pageerror")
        }
        await Brand.deleteOne({_id:id})
        res.redirect("/admin/brands")

    } catch (error) {
        console.log("error deleting brand",error.message);
        res.redirect("/pageerror")
        
    }
}

const editBrandPage = async (req, res) => {
    try {
        const { id } = req.query; // Get the brand ID from the query params
        if (!id) {
            return res.status(400).redirect("/pageerror");
        }

        const brand = await Brand.findById(id); // Fetch the brand details by ID
        if (!brand) {
            return res.status(404).redirect("/pageerror"); // Brand not found
        }

        res.render("edit-Brand", { brand }); // Render the edit page with brand data
    } catch (error) {
        console.log("Error loading edit brand page:", error.message);
        res.redirect("/pageerror");
    }
};

const editBrand = async (req, res) => {
    try {
        const { id, name } = req.body; // Extract brand ID and updated name from the request body

        // Validate input
        if (!id || !name || name.trim().length < 2) {
            return res.status(400).json({ error: "Invalid input. Brand name must be at least 2 characters long." });
        }

        // Check for duplicate brand names (case-insensitive, excluding the current brand)
        const existingBrand = await Brand.findOne({
            brandName: { $regex: `^${name}$`, $options: "i" },
            _id: { $ne: id }, // Exclude the current brand being edited
        });

        if (existingBrand) {
            return res.status(400).json({ error: "Brand already exists. Please choose another name." });
        }

        // Prepare the update object
        const updateData = { brandName: name };
        if (req.file && req.file.filename) {
            updateData.brandImage = req.file.filename; // Update the image if a new one is uploaded
        }

        // Update the brand in the database
        const updatedBrand = await Brand.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedBrand) {
            return res.status(404).json({ error: "Brand not found. Please try again." });
        }

        // Redirect to the brands page after successful update
        res.status(200).json({ success: true, message: "Brand updated successfully!" });
    } catch (error) {
        console.error("Error updating brand:", error.message);
        res.status(500).json({ error: "An unexpected error occurred. Please try again later." });
    }
};





module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unblockBrand,
    deleteBrand,
    editBrand,
    editBrandPage
}