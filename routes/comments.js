var express = require('express');
var router = express.Router();
const { CheckLogin } = require('../utils/authHandler');
const { body, validationResult } = require('express-validator');

let commentModel = require('../schemas/comments');
let productModel = require('../schemas/products');
let mongoose = require('mongoose');

// GET all comments for a product
router.get('/product/:productId', async function (req, res, next) {
    try {
        let productId = req.params.productId;
        
        // Validate objectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).send({
                success: false,
                message: "Invalid product ID"
            });
        }

        let comments = await commentModel.find({
            product: productId,
            isDeleted: false
        })
        .populate({
            path: 'user',
            select: 'username fullName avatar'
        })
        .populate({
            path: 'product',
            select: 'title'
        })
        .sort({ createdAt: -1 });

        res.send({
            success: true,
            message: "Get comments successfully",
            data: comments
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Error fetching comments",
            error: error.message
        });
    }
});

// GET single comment by ID
router.get('/:commentId', async function (req, res, next) {
    try {
        let commentId = req.params.commentId;
        
        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).send({
                success: false,
                message: "Invalid comment ID"
            });
        }

        let comment = await commentModel.findById(commentId)
            .populate({
                path: 'user',
                select: 'username fullName avatar'
            })
            .populate({
                path: 'product',
                select: 'title'
            });

        if (!comment || comment.isDeleted) {
            return res.status(404).send({
                success: false,
                message: "Comment not found"
            });
        }

        res.send({
            success: true,
            message: "Get comment successfully",
            data: comment
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Error fetching comment",
            error: error.message
        });
    }
});

// POST - Create new comment
router.post('/', 
    CheckLogin,
    [
        body('productId').notEmpty().withMessage('Product ID is required'),
        body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('content').trim().notEmpty().withMessage('Content is required')
    ],
    async function (req, res, next) {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).send({
                    success: false,
                    message: "Validation errors",
                    errors: errors.array()
                });
            }

            let { productId, rating, title, content } = req.body;
            let userId = req.user._id;

            // Check if product exists
            const product = await productModel.findById(productId);
            if (!product || product.isDeleted) {
                return res.status(404).send({
                    success: false,
                    message: "Product not found"
                });
            }

            // Create new comment
            let newComment = new commentModel({
                product: productId,
                user: userId,
                rating: rating,
                title: title,
                content: content
            });

            await newComment.save();

            // Populate user and product info before returning
            await newComment.populate({
                path: 'user',
                select: 'username fullName avatar'
            });
            await newComment.populate({
                path: 'product',
                select: 'title'
            });

            res.status(201).send({
                success: true,
                message: "Comment created successfully",
                data: newComment
            });
        } catch (error) {
            res.status(500).send({
                success: false,
                message: "Error creating comment",
                error: error.message
            });
        }
    }
);

// PUT - Update comment
router.put('/:commentId',
    CheckLogin,
    [
        body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        body('title').optional().trim(),
        body('content').optional().trim()
    ],
    async function (req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).send({
                    success: false,
                    message: "Validation errors",
                    errors: errors.array()
                });
            }

            let commentId = req.params.commentId;
            let { rating, title, content } = req.body;
            let userId = req.user._id;

            // Check if comment exists
            const comment = await commentModel.findById(commentId);
            if (!comment || comment.isDeleted) {
                return res.status(404).send({
                    success: false,
                    message: "Comment not found"
                });
            }

            // Check if user is comment author
            if (comment.user.toString() !== userId.toString()) {
                return res.status(403).send({
                    success: false,
                    message: "You can only edit your own comments"
                });
            }

            // Update comment
            if (rating) comment.rating = rating;
            if (title) comment.title = title;
            if (content) comment.content = content;

            await comment.save();

            await comment.populate({
                path: 'user',
                select: 'username fullName avatar'
            });
            await comment.populate({
                path: 'product',
                select: 'title'
            });

            res.send({
                success: true,
                message: "Comment updated successfully",
                data: comment
            });
        } catch (error) {
            res.status(500).send({
                success: false,
                message: "Error updating comment",
                error: error.message
            });
        }
    }
);

// DELETE - Delete comment (soft delete)
router.delete('/:commentId', CheckLogin, async function (req, res, next) {
    try {
        let commentId = req.params.commentId;
        let userId = req.user._id;

        const comment = await commentModel.findById(commentId);
        if (!comment || comment.isDeleted) {
            return res.status(404).send({
                success: false,
                message: "Comment not found"
            });
        }

        // Check if user is comment author
        if (comment.user.toString() !== userId.toString()) {
            return res.status(403).send({
                success: false,
                message: "You can only delete your own comments"
            });
        }

        // Soft delete
        comment.isDeleted = true;
        await comment.save();

        res.send({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Error deleting comment",
            error: error.message
        });
    }
});

module.exports = router;
