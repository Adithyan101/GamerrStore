const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const {userAuth, adminAuth} = require("../middlewares/auth");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController");
const inventoryController = require("../controllers/admin/inventoryController");
const couponController = require("../controllers/admin/couponController");
const dashboardController = require("../controllers/admin/dashboardController");
const multer = require("multer");
const storage = require("../helpers/multer");
const upload = multer({storage:storage});


router.get("/pageerror",  adminController.pageerror);
router.get("/login",  adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/logout", adminController.logout);

// Customer management
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth,  customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth,  customerController.customerUnblocked);

// Category management
router.get("/category", adminAuth,  categoryController.categoryInfo);
router.post("/addCategory", adminAuth,  categoryController.addCategory);
router.post("/addCategoryOffer", adminAuth,  categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth,  categoryController.removeCategoryOffer);
router.get("/listCategory", adminAuth,  categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth,  categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth,  categoryController.editCategory);

// Brand management
router.get("/brands", adminAuth,  brandController.getBrandPage);
router.post("/addBrand", adminAuth,  upload.single("image"), brandController.addBrand);
router.get("/blockBrand", adminAuth,  brandController.blockBrand);
router.get("/unblockBrand", adminAuth,  brandController.unblockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);
router.get('/editBrand',adminAuth, brandController.editBrandPage); // Route to load the edit page
router.post('/editBrand',adminAuth, upload.single('image'), brandController.editBrand); // Route to handle the form submission

// Product management
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/addProducts", adminAuth, upload.array("images", 4), productController.addProducts);
router.get("/products", adminAuth,  productController.getAllProducts);
router.get("/blockProduct", adminAuth,  productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post("/editProduct/:id", adminAuth, upload.array("images", 4), productController.editProduct);
router.post("/deleteImage", adminAuth,  productController.deleteSingleImage);

//order management
router.get("/orders", adminAuth, orderController.orderInfo);
router.post("/changeOrderStatus", adminAuth, orderController.changeOrderStatus);
router.post("/cancelOrder", adminAuth, orderController.cancelOrder);

//Inventory management
router.get("/inventory", adminAuth, inventoryController.getInventoryPage);
router.post("/update-stock", adminAuth, inventoryController.updateStock);

//coupon management
router.get("/coupons", adminAuth, couponController.couponInfo);
router.post("/createCoupon", adminAuth, couponController.createCoupon);
router.get("/editCoupon", adminAuth, couponController.editCoupon);
router.post("/updateCoupon", adminAuth, couponController.updateCoupon);
router.get("/deleteCoupon",adminAuth, couponController.deleteCoupon);

//sales&dashboard management
router.get("/getReport", adminAuth,  dashboardController.getReport);
router.get("/", adminAuth,  dashboardController.loadDashboard);




module.exports = router;
