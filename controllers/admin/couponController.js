const Coupon = require("../../models/couponSchema");
const mongoose  = require("mongoose")

const couponInfo = async (req, res) => {
    try {

        const findCoupons = await Coupon.find({})

        return res.render("coupon",{
            coupons:findCoupons
        })
        
    } catch (error) {
        console.log("error in coupon info", error.message);
        res.redirect("/pageerror");
        
    }
}

const createCoupon = async(req,res)=>{
    try {

        const data = {
            couponName : req.body.couponName,
            startDate : new Date(req.body.startDate + "T00:00:00"),
            endDate : new Date(req.body.endDate + "T00:00:00"),
            offerPercentage : parseInt(req.body.offerPercentage),
            minimumPrice : parseInt(req.body.minimumPrice)

        }

        const newCoupon = new Coupon({
            name:data.couponName,
            createdOn:data.startDate,
            expiryOn:data.endDate,
            offerPercentage:data.offerPercentage,
            minimumPrice:data.minimumPrice
        })

        await newCoupon.save();
       
        
        return res.redirect("/admin/coupons")
        
    } catch (error) {
        console.log("error in creating coupon",error.message);
        res.redirect("/pageerror")
        
    }
}

const editCoupon = async(req,res)=>{
    try {

        const id = req.query.id;
        const findCoupon = await Coupon.findById(id)
        if (!findCoupon) {
            return res.status(404).send('Coupon not found');
          }
   
        res.render('edit-coupon',{
            findCoupon:findCoupon
        })
        

        
    } catch (error) {
        console.log("error in editing coupon",error.message);
        res.redirect("/pageerror")
        
    }
}

const updateCoupon = async(req,res)=>{
    try {

       const couponId = req.body.couponId;
       const oid = new mongoose.Types.ObjectId(couponId);
       const selectedCoupon = await Coupon.findOne({_id:oid})

       if(selectedCoupon){
        const startDate = new Date(req.body.startDate)
        const endDate = new Date(req.body.endDate)
        const updatedCoupon = await Coupon.updateOne(
            {_id:oid},
            {$set:{
                name:req.body.couponName,
                createdOn: startDate,
                expiryOn:endDate,
                offerPercentage:parseFloat(req.body.offerPercentage),
                minimumPrice:parseInt(req.body.minimumPrice)
            },
        },{new:true}
        )

        if(updatedCoupon !== null){
            res.send("Coupon updated successfully")
        }else{
            res.status(500).send("Coupon updation failed")
        }

       }

        
    } catch (error) {
        console.log("error in updating coupon",error.message);
        res.redirect("/pageerror")
        
    }
}

const deleteCoupon = async (req, res) => {
    try {
        const id = req.query.id; // Get the coupon ID from the query parameter
        const deletedCoupon = await Coupon.findByIdAndDelete(id); // Delete the coupon by its ID

        if (deletedCoupon) {
            return res.status(200).send("Coupon deleted successfully");
        } else {
            return res.status(404).send("Coupon not found");
        }
    } catch (error) {
        console.log("Error in deleting coupon", error.message);
        res.status(500).send("Internal server error");
    }
};

module.exports = {
    couponInfo,
    createCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon
}