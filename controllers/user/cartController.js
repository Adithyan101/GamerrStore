const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");
const mongodb = require("mongodb");


const getCart = async (req, res) => {
  try {
    const userId = req.session.user ?? req.session.passport.user;
    const userData = await User.findById(userId);
    const wishlistCount = userData.wishlist.length

    // Fetch the cart and populate the product data
    const cart = await Cart.findOne({ userId }).populate("products.productId");
    let totalCartPrice = 0;
    let products = []; // Default to an empty array
    let cartCount = 0; // Initialize cart count

    if (cart) {
      // Loop over each product in the cart to check if it's blocked
      const filteredProducts = await Promise.all(
        cart.products.map(async (item) => {
          const product = await Product.findById(item.productId);

          // If the product is blocked, remove it from the cart
          if (
            (product && product.isBlocked === true) ||
            product.quantity === 0
          ) {
            // Remove the blocked product from the cart
            await Cart.updateOne(
              { userId },
              { $pull: { products: { productId: item.productId } } }
            );
            return null; // Don't keep the blocked product
          }

          // If it's not blocked, keep it in the cart
          totalCartPrice += item.totalPrice;
          cartCount += item.quantity; // Update cart count
          return item; // Return the product if it's not blocked
        })
      );

      // Remove any null entries (blocked products) from the array
      products = filteredProducts.filter((product) => product !== null);
    }

    // Return the products in the cart, cart count, and the total price in JSON format
    res.render("cart", {
      products, // Updated list of products (without blocked ones)
      totalCartPrice,
      user: userData,
      cartCount, // Pass cart count to the frontend
      wishlistCount
    });
  } catch (error) {
    console.log("Error in showing cart page", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const addToCart = async (req, res) => {
  try {
    const MAX_QUANTITY = 5; // Define the maximum quantity per product per user
    let { productId, quantity } = req.query;
    quantity = Number(quantity);
    const userId = req.session.user._id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check stock availability
    if (product.quantity < quantity) {
      return res.status(400).json({
        message: `Only ${product.quantity} units available in stock`,
      });
    }

    const price = product.salePrice;
    const totalPrice = price * quantity;

    const cart = await Cart.findOne({ userId });

    if (cart) {
      const match = cart.products.find(
        (element) => element.productId.toString() === productId
      );

      if (match) {
        // Validate stock before updating the quantity
        if (match.quantity + quantity > product.stock) {
          return res.status(400).json({
            message: `Only ${
              product.stock - match.quantity
            } more units available in stock`,
          });
        }

        if (match.quantity + quantity > MAX_QUANTITY) {
          return res.status(400).json({
            message: `Maximum quantity for this product is ${MAX_QUANTITY}`,
          });
        }

        match.quantity += quantity;
        match.totalPrice = match.quantity * price; // Update total price
        await cart.save();

        return res
          .status(200)
          .json({ message: "Product quantity updated in cart" });
      } else {
        if (quantity > MAX_QUANTITY) {
          return res.status(400).json({
            message: `Maximum quantity for this product is ${MAX_QUANTITY}`,
          });
        }

        cart.products.push({ productId, quantity, price, totalPrice });
        await cart.save();

        return res.status(200).json({ message: "Product added to cart" });
      }
    } else {
      if (quantity > MAX_QUANTITY) {
        return res.status(400).json({
          message: `Maximum quantity for this product is ${MAX_QUANTITY}`,
        });
      }

      const newCart = new Cart({
        userId,
        products: [{ productId, quantity, price, totalPrice }],
      });
      await newCart.save();

      return res.status(200).json({ message: "Product added to cart" });
    }
  } catch (error) {
    console.log("Error in adding to cart", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const userId = req.session.user._id ?? req.session.passport.user;
    const _id = req.query.id;

    const cart = await Cart.findOne({ userId: userId });
  

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // Remove the item from the cart
      await Cart.updateOne(
      { userId: userId },
      { $pull: { products: { productId: _id } } }
    );

    res.redirect("/cart");
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting cart item" });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const MAX_QUANTITY = 5;
    const userId = req.session.user._id ?? req.session.passport.user;
    const { productId, quantity } = req.body;
    console.log("productId:", productId, "quantity:", quantity);
    

    if (!productId || quantity == null) {
      return res.status(400).json({ message: "Invalid product or quantity" });
    }

    if (quantity > MAX_QUANTITY) {
      return res.status(400).json({
        message: `You cannot have more than ${MAX_QUANTITY} of this product in your cart.`,
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const productInCart = cart.products.find(
      (item) => item.productId.toString() === productId
    );

    if (!productInCart) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    const product = await Product.findById(productId);
    if (product.isBlocked === true || product.quantity === 0) {
      // Remove the product from the cart if it's blocked
      await Cart.updateOne({ userId }, { $pull: { products: { productId } } });
      return res
        .status(400)
        .json({ message: "This product is no longer available" });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({
        message: `Only ${product.quantity} units available in stock.`,
      });
    }

    // Update quantity and total price for the product
    productInCart.quantity = quantity;
    productInCart.totalPrice = productInCart.price * quantity;

    // Save the updated cart
    await cart.save();

    res.status(200).json({
      message: "Cart updated successfully",
      updatedProduct: productInCart,
    });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  getCart,
  addToCart,
  removeCartItem,
  updateCartQuantity,
};
