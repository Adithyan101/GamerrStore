const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");


const orderInfo = async(req,res)=>{
    try {

     const { page = 1, limit = 10 } = req.query; // Pagination defaults
    //  const userId = req.session.user ?? req.session.passport.user;
     console.log("Session Data:", req.session);
     const orders = await Order.find()
      .sort({ createdAt: -1 }) // Most recent orders first
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name');

      console.log("orders", orders);
      

      const totalOrders = await Order.countDocuments(); // Total number of orders
      const totalPages = Math.ceil(totalOrders / limit);
      
    
      res.render('orders', {
        data: orders,
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
       
      });

        
    } catch (error) {
        console.log("error geting order Info", error);       
        res.status(500).send('Error fetching orders');
    }
}

const changeOrderStatus = async(req,res)=>{
    try {
        const { orderId, status } = req.body;
        console.log("body", req.body);

        if (!orderId || !status) {
            return res.status(400).json({ status: false, message: 'Missing orderId or status' });
        }
        
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
        if (updatedOrder) {
            res.json({ status: true, message: 'Order status updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (error) {
        console.log("error in changing order status", error.message);       
        res.status(500).json({ success: false, message: 'Error updating order status' });
    }
}

const cancelOrder = async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ status: false, message: 'Order ID is required' });
      }
  
      // Find the order and update its status to 'Cancelled'
      const updatedOrder = await Order.findByIdAndUpdate(orderId, { status: 'Cancelled' }, { new: true });
  
      if (updatedOrder) {
        return res.json({ status: true, message: 'Order has been cancelled' });
      } else {
        return res.status(404).json({ status: false, message: 'Order not found' });
      }
    } catch (error) {
      console.log("Error cancelling order:", error.message);
      return res.status(500).json({ status: false, message: 'Error cancelling the order' });
    }
  };



module.exports = {
    orderInfo,
    changeOrderStatus,
    cancelOrder 
}