const User = require("../models/userSchema")



const userAuth = (req,res,next)=>{
    const userId = req.session?.user ?? req.session.passport?.user;
    if(userId){
        User.findById(userId)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect("/login")
            }
        })
        .catch(error=>{
            console.log("error in user auth middleware",error.message);
            res.status(500).send("Internal server error")
        })
    }else{
        res.redirect("/login")
    }
}

const adminAuth = (req, res, next) => {

    try {
        if (req.session.admin && req.session.adminId) {
            next()
        } else {
            res.redirect("/admin/login")
        }

    }
    catch (error) {
        console.log("error in admin auth middleware", error.message);
        res.status(500).send("Internal server error")
    }
}

module.exports = {
    userAuth,
    adminAuth
}