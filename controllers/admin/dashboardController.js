const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')


const stringToDate = (duration) => {

    if (duration === '1day') {

        return new Date(Date.now() - (1000 * 60 * 60 * 24));

    } else if (duration === '1week') {

        return new Date(Date.now() - (1000 * 60 * 60 * 24 * 7));

    } else if (duration === '1month') {

        return new Date(Date.now() - (1000 * 60 * 60 * 24 * 31));
    }

};


const generateReport = async (duration) => {
    try {
        const date = stringToDate(duration);

        // Fetch orders based on the date range
        const orders = await Order.find({ createdOn: { $gte: date } })
            .populate({
                path: 'orderItems.product',  // Populate the 'product' field in 'orderItems'
                select: 'productName brand regularPrice salePrice category',  // Include product fields
                populate: {
                    path: 'category',  // Populate 'category' within the 'Product' schema
                    select: 'name -_id',  // Only include 'name', exclude '_id'
                },
            });

        console.log(JSON.stringify(orders, null, 2));

        const totalAmount = orders.reduce((acc, ele) => acc + ele.totalPrice, 0);
        const salesCount = orders.reduce((acc, ele) => acc + ele.orderItems.length, 0);
        const couponDeduction = orders.reduce((acc, ele) => acc + ele.discount, 0);

        let totalDiscount = 0;
        const brandSales = {};
        const categorySales = {};
        const productSales = {};

        orders.forEach(order => {
            order.orderItems.forEach(item => {
                const product = item.product;
                if (product) {
                    const regularPrice = product.regularPrice || 0;
                    const salePrice = product.salePrice || 0;
                    const discount = regularPrice - salePrice;
                    totalDiscount += discount;

                    // Count brand sales
                    if (product.brand) {
                        brandSales[product.brand] = (brandSales[product.brand] || 0) + 1;
                    }

                    // Count category sales
                    if (product.category && product.category.name) {
                        categorySales[product.category.name] = (categorySales[product.category.name] || 0) + 1;
                    }

                    // Count product sales (using productName)
                    if (product.productName) {
                        productSales[product.productName] = (productSales[product.productName] || 0) + 1;
                    }
                }
            });
        });

        // Get top 10 best-selling products sorted by sales count
        const topSellingProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1]) // Sort by sales count in descending order
            .slice(0, 10); // Get top 10 products

        // Get top 10 best-selling brands sorted by sales count
        const topSellingBrands = Object.entries(brandSales)
            .sort((a, b) => b[1] - a[1]) // Sort by sales count in descending order
            .slice(0, 10); // Get top 10 brands

        // Get top 10 best-selling categories sorted by sales count
        const topSellingCategories = Object.entries(categorySales)
            .sort((a, b) => b[1] - a[1]) // Sort by sales count in descending order
            .slice(0, 10); // Get top 10 categories

        console.log("Top Selling Products:", topSellingProducts);
        console.log("Top Selling Brands:", topSellingBrands);
        console.log("Top Selling Categories:", topSellingCategories);

        // Determine the top brand, category, and product
        const topBrand = Object.entries(brandSales).reduce((a, b) => (b[1] > a[1] ? b : a), [null, 0]);
        const topCategory = Object.entries(categorySales).reduce((a, b) => (b[1] > a[1] ? b : a), [null, 0]);

        // Transaction details
        const transactions = orders.map(order => ({
            orderId: order.orderId,
            customerId: order.userId,
            totalPrice: order.totalPrice,
            createdOn: order.createdOn,
        }));

        return { 
            totalDiscount, 
            totalAmount, 
            salesCount, 
            couponDeduction, 
            transactions, 
            topSellingProducts, 
            topSellingBrands, 
            topSellingCategories, 
            topBrand: topBrand[0], 
            topCategory: topCategory[0]
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
};



const loadDashboard = async (req, res) => {
    const { totalDiscount, totalAmount, salesCount, couponDeduction, transactions, topSellingProducts, topSellingBrands, topSellingCategories, topBrand, topCategory } = await generateReport('1day');


    

    return res.render('dashboard', { 
        totalDiscount, 
        totalAmount, 
        salesCount, 
        couponDeduction, 
        transactions, 
        topSellingProducts,  // Pass top-selling products
        topSellingBrands,    // Pass top-selling brands
        topSellingCategories, // Pass top-selling categories
        topBrand, 
        topCategory ,
    });
};


const getReport = async (req, res) => {
    try {
        const duration = req.query.duration;

        const { totalDiscount, totalAmount, salesCount, couponDeduction, transactions, topBrand, topCategory, topProduct, topSellingCategories, topSellingBrands, topSellingProducts } = await generateReport(duration);

        console.log(topBrand, topCategory, topProduct);
        
      

       
        return res.status(200).json({ 
            totalDiscount, 
            totalAmount, 
            salesCount, 
            couponDeduction, 
            transactions, 
            topBrand, 
            topCategory, 
            topProduct,
            topSellingCategories,
            topSellingBrands,
            topSellingProducts
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Failed to generate report');
    }
};



module.exports = {
    getReport,
    loadDashboard,
};
