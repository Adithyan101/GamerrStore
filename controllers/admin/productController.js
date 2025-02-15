const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    res.render("product-add", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;
    const productsExists = await Product.findOne({
      productName: products.productName,
    });
    if (!productsExists) {
      const images = [];

      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;

          const resizedImagePath = path.join(
            "public",
            "uploads",
            "product-images",
            req.files[i].filename
          );

          await sharp(originalImagePath)
            .resize({ width: 440, height: 440 })
            .toFile(resizedImagePath);
          images.push(req.files[i].filename);
        }
      }

      const categoryId = await Category.findOne({ name: products.category });

      if (!categoryId) {
        return res.status(400).json("Inavlid category name");
      }

      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        brand: products.brand,
        category: categoryId._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdAt: new Date(),
        quantity: products.quantity,
        color: products.color,
        productImage: images,
        status: "Available",
      });

      await newProduct.save();
      return res.json({
        success: true,
        message: "Your product has been added successfully.",
        redirectUrl: "/admin/products",
      });
    } else {
      return res
        .status(400)
        .json("Product already exist, please try with another name");
    }
  } catch (error) {
    console.log("error saving product", error.message);
    return res.redirect("/admin/pageerror");
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 4;

    const productData = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    const count = await Product.countDocuments({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    });

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res.redirect("/pageerror");
  }
};


const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getEditProduct = async (req, res) => {

  try {
    const id = req.query.id;
    const product = await Product.findOne({ _id: id }).populate("category");
    const category = await Category.find({});
    console.log("category", category);
    
    const brand = await Brand.find({});
    res.render("edit-product", {
      product: product,
      cat: category,
      brand: brand,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const editProduct = async (req, res) => {
  try {
        const id = req.params.id;
        console.log("Product ID:", id);
        const data = req.body;
        console.log("data", data);
        
    const product = await Product.findOne({ _id: id });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }


    // const categoryDoc = await Category.findOne({ name: data.category });
    // if (!categoryDoc) {
    //   return res.status(400).json({ error: "Invalid category name" });
    // }


    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res
        .status(400)
        .json({
          error:
            "Product with this name already exists. Please try with another name.",
        });
    }

    const images = [];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      // category: data.category,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      color: data.color,
    };
    if (req.files.length > 0) {
      updateFields.$push = { productImage: { $each: images } };
    }

    await Product.findByIdAndUpdate(id, updateFields, { new: true });
    res.redirect("/admin/products");
  } catch (error) {
    console.log("error editing product", error.message);
    res.redirect("/pageerror");
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;

    // Pull the image from the product's productImage array
    const product = await Product.findByIdAndUpdate(
      productIdToServer,
      { $pull: { productImage: imageNameToServer } },
      { new: true }
    );

    // Construct the image file path
    const imagePath = path.join(
      "public",
      "uploads",
      "re-image",
      imageNameToServer
    );

    // Check if the image exists and delete it
    if (fs.existsSync(imagePath)) {
      await fs.promises.unlink(imagePath); // Using promises instead of the sync version
      console.log(`Image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`Image ${imageNameToServer} not found.`);
    }

    // Send a success response
    res.send({ status: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error while deleting image:", error);
    // Handle error gracefully
    res
      .status(500)
      .send({
        status: false,
        message: "An error occurred while deleting the image",
      });
  }
};

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
};
