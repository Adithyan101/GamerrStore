const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Wishlist = require("../../models/wishlistSchema")
const Cart = require("../../models/cartSchema")

const getWishlist = async (req, res) => {
    try {

        const userId = req.session.user ?? req.session.passport.user;
        const user = await User.findOne({ _id: userId });
        const products = await Product.find({ _id: { $in: user.wishlist } }).populate('category');
        const wishlistCount = user.wishlist.length
        const cart = await Cart.findOne({ userId: userId });
        const cartCount = cart?.products?.reduce((total, product) => total + product.quantity, 0) || 0;
        res.render("wishlist", { user, wishlist:products,wishlistCount,cartCount });
    
        
    } catch (error) {
        console.log("error in wishlist",error);
        res.redirect("/pageNotFound");
        
    }
}

const addToWishlist = async(req,res)=>{
    try {

        const userId = req.session.user ?? req.session.passport.user;
        const productId = req.body.productId;
        const user = await User.findById( userId );

        if (!Array.isArray(user.wishlist)) {
            user.wishlist = [];
          }
        
        if(user.wishlist.includes(productId)){
            return res.status(200).json({status:false,message:"Product already in wishlist"});
        }

        user.wishlist.push(productId);
        await user.save();
        res.status(200).json({status:true,message:"Product added to wishlist"});
        
    } catch (error) {
        console.log("error in addToWishlist",error);
        return res.status(200).json({status:false,message:"Something went wrong"});
    }
}

const removeProduct = async(req,res)=>{
    try {

        const userId = req.session.user ?? req.session.passport.user;
        const productId = req.query.productId;
        const user = await User.findById( userId );
        const index = user.wishlist.indexOf(productId);
        if(index === -1){
            return res.status(200).json({status:false,message:"Product not in wishlist"});
        }
        user.wishlist.splice(index,1);
        await user.save();
        res.redirect("/wishlist");
        
    } catch (error) {
        console.log("error in removing wishlist");
        return res.status(200).json({status:false,message:"Something went wrong"});
        
    }
}

module.exports = {
    getWishlist,
    addToWishlist,
    removeProduct
}