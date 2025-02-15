const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const session = require("express-session");

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-character alphanumeric code
}

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log("error hashing password", error.message);
  }
};

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      require: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP for password reset",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP: ${otp}</h4><br></b>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("email sent ", info.messageId);
    return true;
  } catch (error) {
    console.log("error sending email", error.messageId);
    console.log(error.message);

    return false;
  }
};

const getForgotPassPage = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log("error shwoing forgot pass page", error.message);
  }
};

const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("forgotPass-otp");
        console.log("OTP:", otp);
      } else {
        res.json({
          success: false,
          message: "Failed to sent OTP. Please try again.",
        });
      }
    } else {
      res.render("forgot-password", {
        message: "User with this email does not exist",
      });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log(error.message);
  }
};

const verifyForgotPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectURL: "/reset-password" });
    } else {
      res.json({ success: false, message: "OTP not matching" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "An error occured. Please try again." });
  }
};

const userProfile = async (req, res) => {
  try {
    const userId = req.session?.user ?? req.session?.passport?.user;
    const userData = await User.findById(userId);
    const addressData = await Address.findOne({ userId: userId });
    const walletData = await Wallet.findOne({ userId: userId });
    const cart = await Cart.findOne({ userId: userId });
    
    const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;
    const wishlistCount = await Wishlist.findOne({ userId }).countDocuments();

    const walletDetails = walletData || { balance: 0, transactions: [] };

    res.render("profile", {
      user: userData,
      userAddress: addressData,
      wallet: walletDetails,
      cartCount,
      wishlistCount,
      referalCode:userData.referralCode
    });
  } catch (error) {
    console.log("error showing user profile", error.message);
    res.redirect("/pageNotFound");
  }
};

const getResetPassPage = async (req, res) => {
  try {
    res.render("reset-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const resendOtp = async (req, res) => {
  try {
    constotp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;
    console.log("Resending otp to email: ", email);
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("resend OTP:", otp);
      res
        .status(200)
        .json({ success: true, message: "Resend OTP successfully" });
    }
  } catch (error) {
    console.log("error in resend otp", error.message);
    res.status(500).json({ succes: false, message: "Internal Server error" });
  }
};

const postNewPassword = async (req, res) => {
  try {
    const { newPass1, newPass2 } = req.body;
    const email = req.session.email;
    if (newPass1 === newPass2) {
      const passwordHash = await securePassword(newPass1);
      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );
      res.redirect("/login");
    } else {
      res.render("reset-password", { message: "Password do not match." });
    }
  } catch (error) {
    res.redirect("/pageNotfound");
  }
};

const addAddress = async (req, res) => {
  try {

    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const wishlist = await Wishlist.findOne({ userId: userData._id });
    const wishlistCount = wishlist?.userData.wishlist.length || 0;
    const cart = await Cart.findOne({ userId: userData._id });
    const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;

    res.render("add-address", { user: user, cartCount, wishlistCount });
  } catch (error) {
    res.redirect("pageNotFound");
    console.log(error.message);
  }
};

const postAddAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    const { addressType, name, city, landMark, state, pincode, phone } =
      req.body;

    const userAddress = await Address.findOne({ userId: userData._id });
    if (!userAddress) {
      const newAddress = new Address({
        userId: userData._id,
        address: [{ addressType, name, city, landMark, state, pincode, phone }],
      });
      await newAddress.save();
    } else {
      userAddress.address.push({
        addressType,
        name,
        city,
        landMark,
        state,
        pincode,
        phone,
      });
      await userAddress.save();
    }
    res.status(200).json({ message: 'Address added successfully!' });
  } catch (error) {
    console.log("error adding address", error.message);
    res.redirect("/pageNotFound");
  }
};

const editAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const user = req.session.user;
    const cart = await Cart.findOne({ userId: user });
    const wishlist = await Wishlist.findOne({ userId: user });
    const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;
    const wishlistCount = wishlist?.userData.wishlist.length || 0;
    const currAddress = await Address.findOne({
      "address._id": addressId,
    });

    if (!currAddress) {
      return res.redirect("/pageNotFound");
    }

    const addressData = currAddress.address.find((item) => {
      return item._id.toString() === addressId.toString();
    });

    if (!addressData) {
      return res.redirect("/pageNotFound");
    }

    res.render("edit-address", { address: addressData, user: user, cartCount, wishlistCount });
  } catch (error) {
    console.log("errror in edit address", error.message);
    res.redirect("/pageNotFound");
  }
};

const postEditAddress = async (req, res) => {
  try {
    const data = req.body;
    const addressId = req.query.id;
    const user = req.session.user;
    const findAddress = await Address.findOne({ "address._id": addressId });
    if (!addressId) {
      res.redirect("/pageNotFound");
    }
    await Address.updateOne(
      { "address._id": addressId },
      {
        $set: {
          "address.$": {
            _id: addressId,
            addressType: data.addressType,
            name: data.name,
            city: data.city,
            landMark: data.landMark,
            state: data.state,
            pincode: data.pincode,
            phone: data.phone,
            altPhone: data.altPhone,
          },
        },
      }
    );

    res.redirect("/userProfile");
  } catch (error) {
    console.log("error in edit address", error.message);
    res.redirect("/pageNotFound");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const findAddress = await Address.findOne({ "address._id": addressId });
    if (!findAddress) {
      return res.status(404).send("Address not found.");
    }

    await Address.updateOne(
      {
        "address._id": addressId,
      },
      {
        $pull: {
          address: {
            _id: addressId,
          },
        },
      }
    );

    res.status(200).json({ success: true, message: 'Address deleted successfully' });

  } catch (error) {
    console.log("error in deleting address", error.message);
    res.redirect("/pageNotFound");
  }
};

const changePassword = async (req, res) => {
  try {
    res.render("change-password", {
      user: req.session.user,
    });
  } catch (error) {
    console.log("errror getting change-password page", error.message);
    res.redirect("/pageNotFound").status(404);
  }
};

const changePasswordValid = async (req, res) => {
  try {
    const { email } = req.body;
    const userExist = await User.findOne({ email });
    if (userExist) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("change-password-otp", {
          user: req.session.user,
        });
        console.log("email sent:", email);
        console.log("OTP:", otp);
      } else {
        res.json({
          success: false,
          message: "Failed to sent OTP. Please try again.",
        });
      }
    } else {
      res.render("change-password", {
        message: "User with this email does not exist",
      });
    }
  } catch (error) {
    console.log("error in change password validation", error.message);
    res.redirect("/pageNotFound").status(404);
  }
};
const verifyChangePassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectURL: "/reset-password" });
    } else {
      res.json({ success: false, message: "OTP not matching" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server error" });
    console.log("error in verifying pass OTP", error.message);
  }
};

const getChangeNamePhonePage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const cart = await Cart.findOne({ userId: userId });
    const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;
    const wishlistCount = await Wishlist.findOne({ userId }).countDocuments();


    if (!userData) {
      return res.redirect("/pageNotFound");
    }

    res.render("change-name-phone", { user: userData , cartCount, wishlistCount});
  } catch (error) {
    console.log("Error rendering change name/phone page:", error.message);
    res.redirect("/pageNotFound");
  }
};

const postChangeNamePhone = async (req, res) => {
  try {
    const userId = req.session.user;
    const { newName, newPhone } = req.body;

    if (!newName || !newPhone) {
      return res.render("change-name-phone", {
        message: "Both name and phone number are required.",
        user: { name: newName, phone: newPhone },
      });
    }

    await User.findByIdAndUpdate(userId, {
      name: newName,
      phone: newPhone,
    });

    res.redirect("/userProfile");
  } catch (error) {
    console.log("Error updating name and phone:", error.message);
    res.redirect("/pageNotFound");
  }
};

const getWalletDetails = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // Fetch wallet details for the user
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      // Return default balance and an empty transaction list if no wallet is found
      return res.status(200).json({
        balance: 0,
        transactions: [],
        message: "No wallet found. A default wallet has been initialized.",
      });
    }

    // Return the wallet's balance and transaction history
    res.status(200).json({
      balance: wallet.balance,
      transactions: wallet.transactions,
      message: "Wallet details retrieved successfully.",
    });
  } catch (error) {
    console.error("Error fetching wallet details:", error);
    res.status(500).json({
      message: "Failed to fetch wallet details. Please try again later.",
    });
  }
};

module.exports = {
  userProfile,
  getForgotPassPage,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  postNewPassword,
  addAddress,
  postAddAddress,
  editAddress,
  postEditAddress,
  deleteAddress,
  changePassword,
  changePasswordValid,
  verifyChangePassOtp,
  getChangeNamePhonePage,
  postChangeNamePhone,
  getWalletDetails,
};
