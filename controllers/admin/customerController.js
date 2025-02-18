const User = require("../../models/userSchema")


const customerInfo = async(req,res)=>{
    try {
        
        let search = "";
        if(req.query.search){
            search = req.query.search
        }
        let page = 1;
        if(req.query.page){
            page = req.query.page
        }
        const limit = 4;
        const userData = await User.find({
            isAdmin:false,
            $or:[

                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}}
            ],
        })

  .limit(limit*1)
  .skip((page-1)*limit)
  .exec();
  console.log("userData",userData)

  const count = await User.find({
    isAdmin:false,
    $or:[

        {name:{$regex:".*"+search+".*"}},
        {email:{$regex:".*"+search+".*"}}
    ],
  }).countDocuments();

  res.render('customers', { 
    data: userData, 
    currentPage: page, 
    totalPages: Math.ceil(count / limit), 
    search 
});


    } catch (error) {
        console.log("error",error.message)
    }
}

const customerBlocked = async(req,res)=>{
    try {
        
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/users?status=blocked")

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const customerUnblocked = async(req,res)=>{
    try {
        
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/users?status=unblocked")

    } catch (error) {
        res.redirect("/pageerror")
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked
}