const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Cart = require("../../models/cartSchema");
const Wallet = require("../../models/walletSchema");
const Wishlist = require("../../models/wishlistSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-character alphanumeric code
}

const loadSignup = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log("home page not loading", error);
    res.status(500).send("Server error");
  }
};

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    // res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  try {
    const userId = req.session?.user ?? req.session?.passport?.user;
    const userData = userId ? await User.findOne({ _id: userId }) : null;
    const categories = await Category.find({ isListed: true });
    const cart = await Cart.findOne({ userId: userId }); // Fetch cart for the user
    const wishlist = await Wishlist.findOne({ userId: userId });

    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    });

    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate cart count
    const cartCount =
      cart?.products?.reduce((total, product) => total + product.quantity, 0) ||
      0;
    const wishlistCount = wishlist?.userData.wishlist.length || 0;

    if (userId) {
      const userData = await User.findOne({ _id: userId });
      const wishlistCount = userData.wishlist.length;

      return res.render("home", {
        user: userData,
        products: productData,
        cartCount,
        wishlist,
        wishlistCount,
        cart,
      });
    } else {
      return res.render("home", {
        products: productData,
        cartCount,
        wishlistCount,
      });
    }
  } catch (error) {
    console.log("Home page not found", error);
    res.status(500).send("Server error");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); //to generate 6 digit otp
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}<b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.log("error sending email", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cPassword, referralCode } = req.body;
    console.log(
      "Received data:",
      name,
      phone,
      email,
      password,
      cPassword,
      referralCode
    );

    if (password !== cPassword) {
      return res.render("signup", { message: "Passwords do not match!" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "User with this email already exists!",
      });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.json("email-error");
    }

    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password, referralCode };

    res.render("verify-otp");
    console.log("OTP sent", otp);
  } catch (error) {
    console.log("signup error", error);
    res.redirect("/pageNotFound");
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log("error hashing password", error.message);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log("Received OTP:", otp);

    if (otp === req.session.userOtp) {
      const { name, phone, email, password, referralCode } =
        req.session.userData;
      const passwordHash = await securePassword(password);

      // Generate referral code for the new user
      const generatedReferralCode = generateReferralCode();

      let walletCredit = 0;

      // Check if the provided referral code is valid
      if (referralCode) {
        const referringUser = await User.findOne({ referralCode });

        if (referringUser) {
          let referringUserWallet = await Wallet.findOne({
            userId: referringUser._id,
          });

          // Create a wallet for the referring user if it doesn't exist
          if (!referringUserWallet) {
            referringUserWallet = new Wallet({
              userId: referringUser._id,
              balance: 0,
            });
            await referringUserWallet.save();
          }

          // Add credit to the referring user's wallet
          walletCredit = 100; // Example credit amount
          referringUserWallet.balance += walletCredit;
          referringUserWallet.transactions.push({
            amount: walletCredit,
            type: "credit",
            description: "Referral credit",
          });
          await referringUserWallet.save();
        } else {
          console.log("Invalid referral code provided");
        }
      }

      // Create a new user instance
      const saveUserData = new User({
        name,
        email,
        phone,
        password: passwordHash,
        referralCode: generatedReferralCode,
        referredBy: referralCode || null,
      });

      await saveUserData.save();

      // Create a wallet for the new user
      const newUserWallet = new Wallet({
        userId: saveUserData._id,
        balance: 0, // Initial wallet balance
      });

      await newUserWallet.save();

      res.json({ success: true, redirectUrl: "/" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP, please try again" });
    }
  } catch (error) {
    console.log("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "An error occurred!" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("resend OTP:", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP Resend Successfully" });
    } else {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed To Send OTP. Please try again",
        });
    }
  } catch (error) {
    console.log("error resending OTP", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error. please try again",
      });
  }
};

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password, referedBy } = req.body;

    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.render("login", { message: "User not found" });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by admin" });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    const referralCode = generateReferralCode();

    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect password" });
    }

    req.session.user = {
      _id: findUser._id,
      name: findUser.name,
      email: findUser.email,
    };

    res.redirect("/");
  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "login failed. Please try agin" });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("session destruction error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("logout error", error.message);
    res.redirect("/pageNotFound");
  }
};

const loadShoppingPage = async (req, res) => {
  try {
    const sortOption = req.query.sort || "";
    const userId = req.session?.user ?? req.session?.passport?.user;
    const cart = await Cart.findOne({ userId: userId });
    const cartCount =
      cart?.products?.reduce((total, product) => total + product.quantity, 0) ||
      0;

    const userData = userId ? await User.findOne({ _id: userId }) : null;
    const wishlistCount = userData.wishlist.length;
    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.map((category) => category._id.toString());
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const products = await Product.find({
      isBlocked: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    })
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments({
      isBlocked: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    });
    const totalPages = Math.ceil(totalProducts / limit);

    const brands = await Brand.find({ isBlocked: false });
    const categoriesWithIds = categories.map((category) => ({
      _id: category._id,
      name: category.name,
    }));

    res.render("shop", {
      user: userData,
      products: products,
      category: categoriesWithIds,
      brand: brands,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: totalPages,
      selectedSort: sortOption,
      cartCount: cartCount,
      wishlistCount: wishlistCount,
      searchQuery:req.query.query || "",
      selectedBrand: req.query.brand || "",
      selectedPrice: req.query.price || "",
    });
  } catch (error) {
    console.log("error showing shopping page", error.message);
    res.redirect("/pageNotFound");
  }
};

const filterProduct = async (req, res) => {
  try {
    const user = req.session?.user ?? req.session.passport?.user;
    const userdata = user ? await User.findOne({ _id: user }) : null; 
    const sortOption = req.query.sort || "";
    const category = req.query.category;
    const brand = req.query.brand;

    const cart = await Cart.findOne({ userId: user });
    const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) ||0;

    const wishlistCount = userdata.wishlist.length;

    const findCategory = category
      ? await Category.findOne({ _id: category })
      : null;
    const findBrand = brand ? await Brand.findOne({ _id: brand }) : null;

    const brands = await Brand.find({}).lean();
    const query = {
      isBlocked: false,
      quantity: { $gt: 0 },
    };

    if (findCategory) {
      query.category = findCategory._id;
    }

    if (findBrand) {
      query.brand = findBrand.brandName;
    }

    let findProducts = await Product.find(query).lean();
    findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const categories = await Category.find({ isListed: true });

    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(findProducts.length / itemsPerPage);
    const currentProduct = findProducts.slice(startIndex, endIndex);

    let userData = null;
    if (user) {
      userData = await User.findOne({ _id: user });
      if (userData) {
        const searchEntry = {
          category: findCategory ? findCategory._id : null,
          brand: findBrand ? findBrand.brandName : null,
          searchedOn: new Date(),
        };
        userData.searchHistory.push(searchEntry);
        await userData.save();
      }
    }

    req.session.filteredProducts = currentProduct;

    res.render("shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      brand: brands,
      totalPages,
      currentPage,
      selectedCategory: category || null,
      selectedBrand: brand || null,
      selectedSort: sortOption,
      cartCount,
      wishlistCount,
      searchQuery:req.query.query || "",
      selectedPrice: req.query.price || "",
  
    });
  } catch (error) {
    console.log("errror in filtering ptoduct", error.message);
    res.redirect("/pageNotFound");
  }
};

const filterByPrice = async (req, res) => {
  try {
    const user = req.session?.user ?? req.session.passport?.user;
    const sortOption = req.query.sort || "";
    const userData = await User.findOne({ _id: user });
    const brands = await Brand.find({}).lean();
    const categories = await Category.find({ isListed: true }).lean();
    const wishlistCount = userData.wishlist.length;
    const cart = await Cart.findOne({ userId: user }); // Fetch cart for the user 
    const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;

    const minPrice = parseFloat(req.query.gt) || 0;
    const maxPrice = parseFloat(req.query.lt) || Number.MAX_SAFE_INTEGER;

    let findProducts = await Product.find({
      salePrice: { $gt: minPrice, $lt: maxPrice },
      isBlocked: false,
      quantity: { $gt: 0 },
    }).lean();

    // Sort products by creation date (most recent first)
    findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;

    let totalPages = Math.ceil(findProducts.length / itemsPerPage);
    const currentProduct = findProducts.slice(startIndex, endIndex);
    req.session.filteredProducts = findProducts;

    res.render("shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      brand: brands,
      totalPages,
      currentPage,
      selectedSort: sortOption,
      wishlistCount,
      cartCount,
      searchQuery:req.query.query || "",
      selectedPrice: req.query.price || "",
      selectedBrand: req.query.brand || "",
  
    });
  } catch (error) {
    console.error("Error filtering by price:", error.message);
    res.redirect("/pageNotFound");
  }
};

const searchProducts = async (req, res) => {
  try {
    const user = req.session?.user ?? req.session.passport?.user;
    const userData = user ? await User.findOne({ _id: user }) : null;
    const search = req.body.query || req.query.query || ""; // Preserve search query across requests
    const sortOption = req.body.sort || req.query.sort || "name-asc"; // Default sort option
    
    const brands = await Brand.find({}).lean();
    const categories = await Category.find({ isListed: true }).lean();
    const categoryIds = categories.map((category) => category._id.toString());

    const wishlistCount = userData?.wishlist.length || 0;
    const cart = await Cart.findOne({ userId: user });
    const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;

    // Sorting criteria
    const sortCriteria = {
      "name-asc": { productName: 1 },
      "name-desc": { productName: -1 },
      "price-asc": { salePrice: 1 },
      "price-desc": { salePrice: -1 },
    }[sortOption] || { productName: 1 };

    // Fetch products based on the search query, ensuring sorting is applied
    let searchResult = await Product.find({
      productName: { $regex: `.*${search}.*`, $options: "i" },
      isBlocked: false,
      quantity: { $gt: 0 },
      category: { $in: categoryIds },
    })
      .sort(sortCriteria) // Apply sorting
      .lean();

    // Pagination logic
    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const totalPages = Math.ceil(searchResult.length / itemsPerPage);
    const currentProduct = searchResult.slice(startIndex, endIndex);

    res.render("shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      brand: brands,
      totalPages,
      currentPage,
      count: searchResult.length,
      searchQuery: search, // Preserve search query
      selectedSort: sortOption, // Preserve selected sort
      wishlistCount,
      cartCount,
    });
  } catch (error) {
    console.error("Error in searching products:", error.message);
    res.redirect("/pageNotFound");
  }
};

const contactUs = async (req, res) => {
  try {
    const user = req.session?.user ?? req.session.passport?.user;
    const userData = user ? await User.findOne({ _id: user }) : null;
    const wishlistCount = userData?.wishlist.length || 0;
    const cart = await Cart.findOne({ userId: user });
    const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;

    res.render("contact-us",{user:userData, cartCount, wishlistCount});
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log("error rendering contact us Page", error.message);
  }
}


module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  loadShoppingPage,
  filterProduct,
  filterByPrice,
  searchProducts,
  contactUs
};
