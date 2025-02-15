const express = require("express")
const router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const passport = require("passport");
const{userAuth} = require("../middlewares/auth");
const productController = require("../controllers/user/productController")
const wishlistController = require("../controllers/user/wishlistController")
const cartController = require("../controllers/user/cartController")
const orderController = require("../controllers/user/orderController")



router.use((req, res, next) => {
    res.locals.user = req.user || null; // Make user available to all views
    next();
  });

//signup and verfication:
router.get("/pageNotFound",userController.pageNotFound)
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)

//google auth:
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
  console.log("Session after login:", req.session);
    res.redirect('/')
})

//login & logout:
router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)

//Home page & shopping page:
router.get("/",userController.loadHomepage)
router.get("/shop",userAuth,userController.loadShoppingPage)
router.get("/filter",userAuth,userController.filterProduct)
router.get("/filterPrice",userAuth,userController.filterByPrice)
router.post("/search",userAuth,userController.searchProducts)
router.get("/contact",userAuth,userController.contactUs)


//product Management:
router.get("/productDetails",productController.productDetails)

//profile management:
router.get("/userProfile",userAuth,profileController.userProfile)
router.get("/changePassword",userAuth,profileController.changePassword)
router.post("/changePassword",userAuth,profileController.changePasswordValid)
router.post("/verify-changepassword-otp",userAuth,profileController.verifyChangePassOtp)
router.get("/forgot-password",profileController.getForgotPassPage)
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post("/resend-forgot-otp",profileController.resendOtp)
router.post("/reset-password",profileController.postNewPassword)
router.get("/change-name-phone",profileController.getChangeNamePhonePage)
router.post("/change-name-phone",profileController.postChangeNamePhone)
router.get("/Wallet",userAuth,profileController.getWalletDetails)



//address management:
router.get("/addAddress",userAuth,profileController.addAddress)
router.post("/addAddress",userAuth,profileController.postAddAddress)
router.get("/editAddress",userAuth,profileController.editAddress)
router.post("/editAddress",userAuth,profileController.postEditAddress)
router.get("/deleteAddress",userAuth,profileController.deleteAddress)

//cart management:
router.get('/cart',userAuth, cartController.getCart);
router.get('/getCart',userAuth, cartController.getCart);
router.get('/addToCart',userAuth, cartController.addToCart);
router.get('/removeCartItem', userAuth, cartController.removeCartItem)
router.post('/cartQtyChange', userAuth, cartController.updateCartQuantity)


//order management:
router.get('/checkout',userAuth, orderController.getCheckoutPage)
router.post('/CheckoutEditAddress',userAuth,orderController.postEditCheckoutAddress)
router.post('/add-checkout-address',userAuth,orderController.postAddCheckoutAddress)
router.post('/placeOrder',userAuth, orderController.placeOrder)
router.get('/orderSuccess',userAuth, orderController.orderSuccess)
router.get('/orderHistory',userAuth, orderController.orderHistory)
router.get('/orderDetails',userAuth, orderController.orderDetails)
router.get('/cancelOrder',userAuth, orderController.cancelOrder)
router.get('/returnOrder',userAuth, orderController.returnOrder)
router.get('/retryPayment',userAuth, orderController.retryPayment)
router.get('/getCoupons',userAuth, orderController.getCoupons)
router.post('/applyCoupon',userAuth, orderController.applyCoupon)
router.post('/removeCoupon',userAuth, orderController.removeCoupon)
router.post('/orderConfirmation',userAuth, orderController.orderConfirmation)


//wishlist management:
router.get('/wishlist',userAuth, wishlistController.getWishlist,);
router.post('/addToWishlist',userAuth, wishlistController.addToWishlist);
router.get('/removeFromWishlist',userAuth, wishlistController.removeProduct);



router.use((req, res) => {
  res.redirect("/pageNotFound");
});


module.exports = router