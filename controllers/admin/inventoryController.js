const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");

const getInventoryPage = async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query; 
      const totalStock = await Product.countDocuments(); // Total number of orders
      const totalPages = Math.ceil(totalStock / limit)

        const products = await Product.find();
        res.render('inventory', { products,currentPage: parseInt(page),totalPages });

    } catch (error) {
        console.log('Error fetching inventory:', error.message);
        res.redirect('/pageerror');
    }
};

const updateStock = async (req, res) => {
    try {
        const { productId, newQuantity } = req.body;

        if (!productId || isNaN(newQuantity) || parseInt(newQuantity) < 0) {
            return res.status(400).json({ message: 'Invalid data provided.' });
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            { quantity: parseInt(newQuantity) },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.json({ message: 'Stock updated successfully.' });
    } catch (error) {
        console.error('Error updating stock:', error.message);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

module.exports = {
    getInventoryPage,
    updateStock
}