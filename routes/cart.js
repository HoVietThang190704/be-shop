let express = require('express');
let router = express.Router()
const { CheckLogin } = require('../utils/authHandler');
let cartModel = require('../schemas/carts')
let inventoryModel = require('../schemas/inventories')
//get
router.get('/', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let cart = await cartModel.findOne({
        user: user._id
    }).populate('products.product')

    res.send({
        success: true,
        message: "Get cart successfully",
        data: cart ? cart.products : []
    })
})
//add
router.post('/add', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let cart = await cartModel.findOne({
        user: user._id
    })
    
    if (!cart) {
        cart = new cartModel({
            user: user._id,
            products: []
        });
    }

    let products = cart.products;
    let productID = req.body.product;
    let checkProduct = await inventoryModel.findOne({
        product: productID
    })
    if (!checkProduct) {
        res.status(404).send({
            message: "san pham khong ton tai"
        })
        return;
    }
    let index = products.findIndex(function (p) {
        return p.product == productID
    })
    if (index < 0) {
        products.push({
            product: productID,
            quantity: 1
        })
    } else {
        products[index].quantity += 1
    }
    await cart.save();
    let populatedCart = await cartModel.findOne({ user: user._id }).populate('products.product');
    res.send({
        success: true,
        message: "Add to cart successfully",
        data: populatedCart.products
    })
})
//remove
router.post('/remove', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let cart = await cartModel.findOne({
        user: user._id
    })

    if (!cart) {
        return res.status(404).send({
            success: false,
            message: "Gio hang khong ton tai"
        })
    }

    let products = cart.products;
    let productID = req.body.product;
    let checkProduct = await inventoryModel.findOne({
        product: productID
    })
    if (!checkProduct) {
        res.status(404).send({
            message: "san pham khong ton tai"
        })
        return;
    }
    let index = products.findIndex(function (p) {
        return p.product == productID
    })
    if (index < 0) {
        res.status(404).send({
            success: false,
            message: "san pham khong ton tai trong gio hang"
        })
    } else {
        products.splice(index, 1)
    }
    await cart.save();
    let populatedCart = await cartModel.findOne({ user: user._id }).populate('products.product');
    res.send({
        success: true,
        message: "Remove from cart successfully",
        data: populatedCart
    })
})
//decrease
router.post('/decrease', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let cart = await cartModel.findOne({
        user: user._id
    })

    if (!cart) {
        return res.status(404).send({
            success: false,
            message: "Gio hang khong ton tai"
        })
    }

    let products = cart.products;
    let productID = req.body.product;
    let checkProduct = await inventoryModel.findOne({
        product: productID
    })
    if (!checkProduct) {
        res.status(404).send({
            message: "san pham khong ton tai"
        })
        return;
    }
    let index = products.findIndex(function (p) {
        return p.product == productID
    })
    if (index < 0) {
        res.status(404).send({
            success: false,
            message: "san pham khong ton tai trong gio hang"
        })
    } else {
        if (products[index].quantity == 1) {
            products.splice(index, 1)
        } else {
            products[index].quantity -= 1
        }
    }
    await cart.save();
    let populatedCart = await cartModel.findOne({ user: user._id }).populate('products.product');
    res.send({
        success: true,
        message: "Decrease quantity successfully",
        data: populatedCart
    })
})
//modify
router.post('/modify', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let cart = await cartModel.findOne({
        user: user._id
    })

    if (!cart) {
        return res.status(404).send({
            success: false,
            message: "Gio hang khong ton tai"
        })
    }

    let products = cart.products;
    let productID = req.body.product;
    let quantity = req.body.quantity;
    let checkProduct = await inventoryModel.findOne({
        product: productID
    })
    if (!checkProduct) {
        res.status(404).send({
            message: "san pham khong ton tai"
        })
        return;
    }
    let index = products.findIndex(function (p) {
        return p.product == productID
    })
    if (index < 0) {
        res.status(404).send({
            success: false,
            message: "san pham khong ton tai trong gio hang"
        })
    } else {
        if (quantity == 0) {
            products.splice(index, 1)
        } else {
            products[index].quantity = quantity;
        }
    }
    await cart.save();
    let populatedCart = await cartModel.findOne({ user: user._id }).populate('products.product');
    res.send({
        success: true,
        message: "Modify quantity successfully",
        data: populatedCart
    })
})
module.exports = router