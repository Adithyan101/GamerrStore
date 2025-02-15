const mongoose = require("mongoose")
const Address = require("./addressSchema")
const Product = require("./productSchema")
const {Schema} = mongoose;
const {v4:uuidv4} = require('uuid')

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
    orderItems: [{

        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            default: 0
        },
        deliveryDate: {
            type: Date,
          }
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    discountedPrice: {
        type: Number 
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:'Address',
        required:true
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:["Placed","Processing","Shipped","Delivered","Cancelled","Return Request","Returned","Payment Pending"]
    },
    createdOn:{
        type:Date,
        default: Date.now(),
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    paymentMethod: {
        type: String,
        required: true
      },
      paymentId: {
        type: String
      },

  
})

const Order = mongoose.model("Order", orderSchema)

module.exports = Order;