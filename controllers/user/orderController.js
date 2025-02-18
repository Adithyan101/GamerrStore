const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");
const Coupon = require("../../models/couponSchema");
const Wishlist = require("../../models/wishlistSchema");
const crypto = require("crypto");
require("dotenv").config();
const Razorpay = require("razorpay");
const { log } = require("util");
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const getCheckoutPage = async (req, res) => {
  try {
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const userId = req.session.user ?? req.session.passport.user;;
    const userData = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("products.productId");
    const wishlistCount = userData.wishlist.length;

    const coupons = await Coupon.find({ isList: true });

    if (!cart || cart.products.length == 0) {
      return res.redirect("/cart");
    }

    const addresses = await Address.findOne({ userId: userId });
    // console.log("addresses",addresses);

    let totalCartPrice = 0;
    let cartCount = 0;
    cart.products.forEach((element) => {
      totalCartPrice += element.totalPrice;
      cartCount += element.quantity;
    });

    let discountedPrice = totalCartPrice;
    const appliedCoupon = req.session.appliedCoupon;

    if (appliedCoupon) {
      const coupon = await Coupon.findOne({
        name: appliedCoupon,
        isList: "true",
      });
      if (coupon && coupon.expiryDate > Date.now()) {
        discountedPrice -= (coupon.discountPercentage / 100) * totalCartPrice;
      } else {
        req.session.appliedCoupon = null; // Clear invalid coupon
      }
    }

    res.render("checkout", {
      user: userData,
      cart,
      userAddress: addresses,
      appliedCoupon: req.session.appliedCoupon || null,
      // couponDiscount: coupon ? coupon.offerPrice : 0,
      totalCartPrice,
      discountedPrice,
      coupons,
      RAZORPAY_KEY_ID,
      wishlistCount,
      cartCount,
    });
  } catch (error) {
    console.log("errro getting checkout page", error.message);
    res.redirect("/pageNotFound");
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user ?? req.session.passport.user;
    let { selectedAddress, paymentMethod } = req.body;

    if (!paymentMethod) {
      return res
        .status(400)
        .json({ success: false, message: "Payment method is missing." });
    }

    if (!["Online Payment", "COD", "Wallet"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment method." });
    }

    const cart = await Cart.findOne({ userId });
    console.log("cart", cart);
    if (!cart || cart.products.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Your cart is empty." });
    }

    if (!selectedAddress) {
      return res
        .status(400)
        .json({ success: false, message: "Please select a valid address." });
    }

    const address = await Address.findOne({
      userId,
      "address._id": selectedAddress,
    });
    if (!address) {
      return res
        .status(400)
        .json({ success: false, message: "Address not found." });
    }

    const orderItems = [];
    for (const cartItem of cart.products) {
      console.log("cartItem", cartItem);
      if (cartItem.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product: ${cartItem.productId}. Quantity must be greater than 0.`,
        });
      }

      const product = await Product.findById(cartItem.productId);
      if (!product || product.quantity < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${
            product?.productName || "Unknown Product"
          }`,
        });
      }

      orderItems.push({
        product: product._id,
        quantity: cartItem.quantity,
        price: cartItem.price,
      });
    }

    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    console.log("totalPrice", totalPrice);

    // Calculate discounted price from session or use total price
    let discountedPrice = req.session.discountedPrice || totalPrice;
    console.log("discountedPrice", discountedPrice);

    let couponApplied = Boolean(req.session.appliedCoupon);
    let appliedCoupon = req.session.appliedCoupon;

    // Handle Online Payment
    if (paymentMethod === "Online Payment") {
      const razorpayOrder = await razorpayInstance.orders.create({
        amount: Math.round(discountedPrice * 100), // Convert to paise
        currency: "INR",
        receipt: `order_${Date.now()}`,
        payment_capture: 1,
      });

      if (!razorpayOrder) {
        return res.status(400).json({
          success: false,
          message: "Failed to create Razorpay order.",
        });
      }

      const order = new Order({
        userId,
        orderItems,
        totalPrice: discountedPrice,
        discountedPrice: totalPrice - discountedPrice,
        paymentMethod,
        address: selectedAddress,
        status: "Payment Pending",
        paymentId: razorpayOrder.id,
        couponApplied,
        appliedCoupon,
      });

      order.save();
      await Cart.findOneAndDelete({ userId });
      req.session.discountedPrice = null; // Clear discounted price from session
      req.session.appliedCoupon = null; // Clear applied coupon from session

      return res.status(200).json({
        paymentMethod: "Online Payment",
        razorpayOrder,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
      });
    } else if (paymentMethod === "COD") {
      if (totalPrice > 1000) {
        return res.status(400).json({
          success: false,
          message: "Orders above ₹1000 are not eligible for COD.",
        });
      }

      const order = new Order({
        userId,
        orderItems,
        totalPrice,
        discountedPrice,
        paymentMethod,
        address: selectedAddress,
        status: "Placed",
        createdOn: new Date(),
        couponApplied,
        appliedCoupon,
        discount: totalPrice - discountedPrice,
      });

      await order.save();
      await Cart.findOneAndDelete({ userId });

      return res.json({
        success: true,
        paymentMethod: "COD",
        totalPrice: discountedPrice,
        orderId: order._id.toString(),
      });
    } else if (paymentMethod === "Wallet") {
      // Fetch the user's wallet details
      const userWallet = await Wallet.findOne({ userId });

      // Check if the user has enough balance
      if (userWallet.balance < discountedPrice) {
        return res.json({
          success: false,
          message: "Insufficient wallet balance.",
        });
      }

      // Proceed with the order creation if balance is sufficient
      const order = new Order({
        userId,
        orderItems,
        totalPrice: discountedPrice,
        discountedPrice: totalPrice - discountedPrice,
        paymentMethod,
        address: selectedAddress,
        status: "Placed",
        createdOn: new Date(),
        couponApplied,
        appliedCoupon,
        discount: totalPrice - discountedPrice,
      });

      await order.save();
      await Cart.findOneAndDelete({ userId });

      // Deduct the amount from the wallet and update the transaction history
      await Wallet.findOneAndUpdate(
        { userId },
        {
          $inc: { balance: -discountedPrice }, // Deduct the amount
          $push: {
            transactions: {
              type: "debit",
              amount: discountedPrice,
              description: `Purchase for order ID: ${order._id}`,
              date: new Date(),
            },
          },
        }
      );

      return res.json({
        success: true,
        paymentMethod: "Wallet",
        totalPrice: discountedPrice,
        orderId: order._id.toString(),
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment method" });
    }
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to place order.",
      error: error.message,
    });
  }
};

const postEditCheckoutAddress = async (req, res) => {
  try {
    const user = req.session.user;
    const data = req.body;
    const addressId = req.body.addressId;
    const userId = req.session.user._id;

    // console.log('User Session:', user);
    // console.log('Request Body:', req.body);

    if (!addressId) {
      console.log("Address ID is missing");
      return res
        .status(400)
        .json({ success: false, message: "Address ID is required" });
    }

    console.log("Updating address with ID:", addressId);

    const updatedAddress = await Address.updateOne(
      { "address._id": addressId },
      {
        $set: {
          "address.$.name": data.name,
          "address.$.city": data.city,
          "address.$.landMark": data.landMark,
          "address.$.state": data.state,
          "address.$.pincode": data.pincode,
          "address.$.phone": data.phone,
        },
      }
    );
    const userAddress = await Address.findOne({ userId: userId });

    console.log("Address updated successfully:", updatedAddress);

    return res.status(200).json({ success: true, userAddress });
  } catch (error) {
    console.error("Error updating address:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error updating address" });
  }
};

const postAddCheckoutAddress = async (req, res) => {
  try {
    const userId = req.session.user ?? req.session.passport.user;
    const data = req.body;
    console.log("body", req.body);

    // Validate incoming data
    if (
      !data.name ||
      !data.city ||
      !data.state ||
      !data.pincode ||
      !data.phone
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // Create new address
    const newAddress = {
      name: data.name,
      city: data.city,
      landMark: data.landMark || "", // Optional field
      state: data.state,
      pincode: data.pincode,
      phone: data.phone,
      userId: userId,
    };

    // Find the user and add the new address
    const userAddress = await Address.findOne({ userId });

    if (!userAddress) {
      // If no address exists, create a new address array for the user
      const newUserAddress = new Address({
        userId,
        address: [newAddress],
      });
      await newUserAddress.save();
    } else {
      // If the user already has addresses, add the new address to the address array
      userAddress.address.push(newAddress);
      await userAddress.save();
    }

    // Return the updated address list
    return res.status(200).json({ success: true, userAddress });
  } catch (error) {
    console.error("Error adding address:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error adding address" });
  }
};

const orderSuccess = async (req, res) => {
  try {
    const user = req.session.user ?? req.session.passport.user;
    const { orderId } = req.query;
    console.log("orderId", orderId);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid orderId format" });
    }

    const orderObjectId = new mongoose.Types.ObjectId(orderId);
    const order = await Order.findById(orderObjectId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    res.render("orderConfirmation", {
      user,
      orderId: order._id,
      orderStatus: order.status,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json(
        { success: false, message: "Failed to render order success page." },
        error.message
      );
  }
};

const orderHistory = async (req, res) => {
  try {
    const userId = req.session.user ?? req.session.passport.user;
    // const userId = req.session.user._id;
    const userData = await User.findById(userId);
    const cartCount = await Cart.findOne({ userId }).countDocuments();
    const wishlistCount = await Wishlist.findOne({ userId }).countDocuments();

    const orders = await Order.find({ userId }).sort({ createdOn: -1 });
    const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    res.render("orderHistory", {
      orders,
      totalSpent,
      user: userData,
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch order history." });
  }
};

const orderDetails = async (req, res) => {
  try {
    const user = req.session.user ?? req.session.passport.user;
    const userId = req.session.user ?? req.session.passport.user;
    const userData = await User.findById(userId);
    const orderId = req.query.id;
    const order = await Order.findById(orderId).populate("orderItems.product");

    const cart = await Cart.findOne({ userId: userId });
    const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;
    const wishlistCount = userData.wishlist.length

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    // Fetch address details
    const addressDoc = await Address.findOne({ "address._id": order.address });

    if (!addressDoc) {
      throw new Error("Address not found.");
    }

    const address = addressDoc.address.find(
      (a) => a._id.toString() === order.address.toString()
    );

    if (!address) {
      throw new Error("Specific address not found in address document.");
    }

    // Attach the address details to the order object
    order.addressDetails = address;

    res.render("orderDetails", { order, userData, cartCount, wishlistCount });
  } catch (error) {
    console.error("Error showing order details:", error.message);
    // res.redirect("/pageNotFound").status(404);
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user ?? req.session.passport.user;
    const id = req.query.id;

    // Fetch the order
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order is already shipped or delivered
    if (["Shipped", "Delivered"].includes(order.status)) {
      return res.status(400).json({
        message: "Order cannot be cancelled as it is already processed",
      });
    }

    const refundAmount = order.totalPrice;

    // Update order status to "Cancelled"
    order.status = "Cancelled";
    // order.cancellationReason = reason || "No reason provided";
    await order.save();

    // Adjust stock for each product in the order
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity },
      });
    }

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
    }

    wallet.balance += refundAmount;
    wallet.transactions.push({
      amount: refundAmount,
      type: "credit",
      description: `Refund for cancelled order: ${order._id}`,
    });

    await wallet.save();

    res.status(200).json({ message: "Order cancelled successfully", order });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getCoupons = async (req, res) => {
  try {
    const userId = req.session.user;
    // Get current date
    const currentDate = new Date();

    // Find active coupons that are not expired
    const availableCoupons = await Coupon.find({
      isList: true,
      expiryOn: { $gte: currentDate }, // Only coupons that are not expired
    });

    console.log("Available Coupons:", availableCoupons);

    res.render("checkout", { availableCoupons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session?.user ?? req.session.passport.user;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized. Please log in." });
    }

    console.log("Request body:", req.body);

    // Check if the coupon exists and is active
    const coupon = await Coupon.findOne({ name: couponCode, isList: true });
    if (!coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid coupon code." });
    }

    // Check if the coupon has expired
    if (coupon.expiryOn < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon has expired." });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.products.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty." });
    }

    // Calculate the total cart price
    const totalCartPrice = cart.products.reduce(
      (total, item) => total + item.totalPrice,
      0
    );

    console.log("Total Cart Price:", totalCartPrice);

    // Validate minimum price requirement for the coupon
    if (totalCartPrice < coupon.minimumPrice) {
      return res.status(400).json({
        success: false,
        message: `Coupon requires a minimum purchase of ₹${coupon.minimumPrice}.`,
      });
    }

    // Calculate the discounted price based on the coupon's offer percentage
    const discount = (totalCartPrice * coupon.offerPercentage) / 100;
    const discountedPrice = totalCartPrice - discount;

    console.log("Discounted Price:", discountedPrice);

    // Store coupon details in the session
    req.session.appliedCoupon = coupon.name;
    req.session.discountedPrice = discountedPrice;

    // Find the pending order, if any
    const order = await Order.findOne({
      userId,
      status: { $in: ["pending", "placed"] },
    });
    console.log("Pending Order:", order);

    if (order) {
      // Update the order with coupon details
      order.couponApplied = true;
      order.discount = discount; // Save the calculated discount
      order.discountedPrice = discountedPrice;

      // Save the updated order
      await order.save();
    }

    console.log("Updated Order:", order);

    // Respond with the updated price
    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully.",
      discount,
      discountedPrice,
      appliedCoupon: coupon.name,
    });
  } catch (error) {
    console.error("Error applying coupon:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const removeCoupon = async (req, res) => {
  try {
    const userId = req.session?.user?._id ?? req.session.passport.user;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized. Please log in." });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart || cart.products.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty." });
    }

    // Calculate the total cart price
    const totalCartPrice = cart.products.reduce(
      (total, item) => total + item.totalPrice,
      0
    );

    // Clear the applied coupon and reset discounted price
    req.session.appliedCoupon = null;
    req.session.discountedPrice = totalCartPrice;

    const order = await Order.findOne({ userId, status: "pending" });
    if (order) {
      // Reset the coupon application in the order
      order.couponApplied = false;
      order.discount = null; // Reset the discount
      order.discountedPrice = null; // Reset the discounted price
      await order.save();
    }

    console.log("Total Price:", totalCartPrice);

    return res.status(200).json({
      success: true,
      message: "Coupon removed successfully.",
      originalPrice: totalCartPrice,
    });
  } catch (error) {
    console.error("Error removing coupon:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const returnOrder = async (req, res) => {
  try {
    const userId = req.session.user ?? req.session.passport.user;
    const { id } = req.query; // Get order ID from query string
    console.log("id", id);

    if (!id) {
      return res.status(400).json({ message: "Order ID is required." });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Check if the order is eligible for return
    if (order.status !== "Delivered") {
      return res
        .status(400)
        .json({ message: "Only delivered orders can be returned." });
    }

    const refundAmount = order.totalPrice;

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
    }

    wallet.balance += refundAmount;
    wallet.transactions.push({
      amount: refundAmount,
      type: "credit",
      description: `Refund for cancelled order: ${order._id}`,
    });

    await wallet.save();

    // Update order status to "Return Request"
    order.status = "Return Request";
    await order.save();

    res.status(200).json({ message: "Return request initiated successfully." });
  } catch (error) {
    console.error("Error initiating return:", error);
    res
      .status(500)
      .json({ message: "An error occurred. Please try again later." });
  }
};

const orderConfirmation = async (req, res) => {
  try {
    // extracting payment details from req body
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    console.log("body", req.body);

    const secret = process.env.RAZORPAY_KEY_SECRET;

    // generating signature using razorpay secret key
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      let order = await Order.findOne({
        paymentId: razorpay_order_id,
      });

      if (order) {
        order.paymentId = razorpay_payment_id;
        order.status = "Placed";
      }

      console.log("order", order);

      await order.save();
      await Cart.findOneAndDelete({ userId: req.session.user._id });

      //render order success page
      res.render("orderConfirmation", {
        orderId: order._id,
        orderStatus: "Success",
      });
    } else {
      // Signature verification failed
      console.log("signature fail");
    }
  } catch (error) {
    //logging error and render order fail page
    console.log(error);
    // res.render("user/purchase/orderFailedPage");
  }
};

const retryPayment = async (req, res) => {
  try {
    const orderId = req.query.orderId;

    const order = await Order.findOne({ _id: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.status === "Placed") {
      return res.status(400).json({ message: "Order already placed." });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Order cancelled." });
    }

    if (order.status === "Return Request") {
      return res.status(400).json({ message: "Order already returned." });
    }

    //handling payment pending:

    if (order.status === "Payment Pending") {
      const razorpayOrder = await razorpayInstance.orders.create({
        amount: Math.round(order.totalPrice * 100), // Convert to paise
        currency: "INR",
        receipt: `order_${Date.now()}`,
        payment_capture: 1,
      });
      if (!razorpayOrder) {
        return res.status(400).json({
          success: false,
          message: "Failed to create Razorpay order.",
        });
      }

      //changint he old id and status
      await Order.findByIdAndUpdate(order._id, {
        paymentId: razorpayOrder.id,
        status: "Payment Pending",
      });

      return res.status(200).json({
        success: true,
        message: "Razorpay order created successfully.",
        order: razorpayOrder,
        key: process.env.RAZORPAY_KEY_ID,
      });
    }
  } catch (error) {
    console.log("error in retry payment", error);
  }
};

module.exports = {
  getCheckoutPage,
  postEditCheckoutAddress,
  postAddCheckoutAddress,
  placeOrder,
  orderSuccess,
  orderHistory,
  orderDetails,
  cancelOrder,
  applyCoupon,
  getCoupons,
  returnOrder,
  removeCoupon,
  orderConfirmation,
  retryPayment,
};
