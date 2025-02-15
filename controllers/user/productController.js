const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

const productDetails = async (req, res) => {
  try {
    const userId = req.session.user ?? req.session.passport?.user; // Handle undefined user
    console.log("User ID:", userId);

    let userData = null;
    let cartCount = 0;
    let wishlistCount = 0;

    if (userId) {
      // If user is logged in, fetch their data
      userData = await User.findById(userId);
      const cart = await Cart.findOne({ userId: userId });
      cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;
      wishlistCount = userData?.wishlist?.length || 0;
    }

    // Fetch product details
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");

    if (!product) {
      return res.redirect("/pageNotfound"); // Redirect if product not found
    }

    const categoryOffer = product.category?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    const totalOffer = categoryOffer + productOffer;

    const relatedProducts = await Product.find({
      brand: product.brand,
      _id: { $ne: productId },
    }).limit(4);

    // Render the product details page
    res.render("product-details", {
      user: userData, // Null if guest
      product: product,
      quantity: product.quantity,
      totalOffer: totalOffer,
      category: product.category,
      relatedProducts,
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.error("Error showing product details:", error);
    res.redirect("/pageNotfound");
  }
};

module.exports = {
  productDetails,
};
