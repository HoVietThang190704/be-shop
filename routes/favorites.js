let express = require('express');
let router = express.Router()
const { CheckLogin } = require('../utils/authHandler');
let favoriteModel = require('../schemas/favorites')
let productModel = require('../schemas/products')

async function getOrCreateFavorite(userId) {
    let favorite = await favoriteModel.findOne({ user: userId });
    if (!favorite) {
        favorite = new favoriteModel({ user: userId });
        await favorite.save();
    }
    return favorite;
}

router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let favorite = await getOrCreateFavorite(req.user._id);
        let populatedFavorite = await favoriteModel.findById(favorite._id).populate({
            path: 'products',
            match: { isDeleted: false }
        });
        res.send({
            success: true,
            message: 'Get favorites successfully',
            data: populatedFavorite.products.filter(Boolean)
        })
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message
        })
    }
})

router.post('/add', CheckLogin, async function (req, res, next) {
    try {
        let productId = req.body.product;
        let product = await productModel.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            res.status(404).send({
                success: false,
                message: 'San pham khong ton tai'
            })
            return;
        }

        let favorite = await getOrCreateFavorite(req.user._id);
        let exists = favorite.products.findIndex(function (item) {
            return item.toString() === productId;
        })

        if (exists < 0) {
            favorite.products.push(productId)
            await favorite.save();
        }

        let populatedFavorite = await favoriteModel.findById(favorite._id).populate({
            path: 'products',
            match: { isDeleted: false }
        });

        res.send({
            success: true,
            message: 'Add favorite successfully',
            data: populatedFavorite.products.filter(Boolean)
        })
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message
        })
    }
})

router.post('/remove', CheckLogin, async function (req, res, next) {
    try {
        let productId = req.body.product;
        let favorite = await getOrCreateFavorite(req.user._id);
        favorite.products = favorite.products.filter(function (item) {
            return item.toString() !== productId;
        })
        await favorite.save();

        let populatedFavorite = await favoriteModel.findById(favorite._id).populate({
            path: 'products',
            match: { isDeleted: false }
        });

        res.send({
            success: true,
            message: 'Remove favorite successfully',
            data: populatedFavorite.products.filter(Boolean)
        })
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message
        })
    }
})

router.post('/toggle', CheckLogin, async function (req, res, next) {
    try {
        let productId = req.body.product;
        let product = await productModel.findOne({ _id: productId, isDeleted: false });
        if (!product) {
            res.status(404).send({
                success: false,
                message: 'San pham khong ton tai'
            })
            return;
        }

        let favorite = await getOrCreateFavorite(req.user._id);
        let exists = favorite.products.findIndex(function (item) {
            return item.toString() === productId;
        })

        if (exists < 0) {
            favorite.products.push(productId)
        } else {
            favorite.products.splice(exists, 1)
        }

        await favorite.save();
        let populatedFavorite = await favoriteModel.findById(favorite._id).populate({
            path: 'products',
            match: { isDeleted: false }
        });

        res.send({
            success: true,
            message: 'Toggle favorite successfully',
            data: populatedFavorite.products.filter(Boolean)
        })
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message
        })
    }
})

module.exports = router