const mongoose = require("mongoose");
const Product = require("./productSchema");
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    coupon:{
        type: Schema.Types.ObjectId,
        ref: 'Coupon'
      },
    products: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: "Product",  // Make sure this is properly referencing the Product model
                required: true,
            },
            quantity: {
                type: Number,
                
            },
            price: {
                type: Number,
                required: true,
            },
            totalPrice: {
                type: Number,
                required: true,
            },
            status: {
                type: String,
                default: "placed",  // Corrected typo
            },
        },
    ],
});



const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
