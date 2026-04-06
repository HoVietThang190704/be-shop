//inventory
//cart
//reservation
//payments
var express = require('express');
var router = express.Router();
const slugify = require('slugify');
const { CheckLogin } = require('../utils/authHandler');

let productModel = require('../schemas/products')
let inventoryModel = require('../schemas/inventories');
const products = require('../schemas/products');
let mongoose = require('mongoose')

/* GET users listing. */
router.get('/', async function (req, res, next) {
  let queries = req.query;
  let titleQ = queries.title ? queries.title : "";
  
  let matchQuery = {
    isDeleted: false,
    title: new RegExp(titleQ, 'i')
  };

  if (queries.min !== undefined || queries.max !== undefined) {
    matchQuery.price = {};
    if (queries.min !== undefined) matchQuery.price.$gte = Number(queries.min);
    if (queries.max !== undefined) matchQuery.price.$lte = Number(queries.max);
  }

  let result = await productModel.find(matchQuery).populate({
    path: 'category',
    select: "name"
  }).sort({ createdAt: -1 });
  res.send({
    success: true,
    message: "Get products successfully",
    data: result
  });
});
///api/v1/products/id
router.get('/:id', async function (req, res, next) {
  try {
    let id = req.params.id;
    let result = await productModel.findById(id);
    if (!result || result.isDeleted) {
      res.status(404).send({
        success: false,
        message: "ID NOT FOUND"
      });
    } else {
      res.send({
        success: true,
        message: "Get product successfully",
        data: result
      })
    }
  } catch (error) {
    res.status(404).send({
      success: false,
      message: "ID NOT FOUND"
    });
  }
});
router.get('/detail/:slug', async function (req, res, next) {
  try {
    let slug = req.params.slug;
    let result = await productModel.findOne({
      slug: slug,
      isDeleted: false
    }).populate({
      path: 'category',
      select: "name"
    });
    if (!result) {
      res.status(404).send({
        success: false,
        message: "PRODUCT NOT FOUND"
      });
    } else {
      res.send({
        success: true,
        message: "Get product successfully",
        data: result
      })
    }
  } catch (error) {
    res.status(404).send({
      success: false,
      message: "ERROR FETCHING PRODUCT"
    });
  }
});
router.post('/', CheckLogin, async function (req, res, next) {
  if (!req.user || !req.user.role || req.user.role.name !== 'ADMIN') {
    return res.status(403).send({
      success: false,
      message: "Tài khoản không có quyền truy cập trang quản trị."
    });
  }

  let session = await mongoose.startSession()
  session.startTransaction()
  try {
    let newProduct = new productModel({
      sku: `SKU-${Date.now()}`,
      title: req.body.title,
      slug: slugify(req.body.title, {
        replacement: '-',
        remove: undefined,
        lower: true
      }),
      price: req.body.price,
      description: req.body.description,
      images: req.body.images,
      category: req.body.category
    })
    await newProduct.save({ session })
    
    let newInventory = new inventoryModel({
      product: newProduct._id,
      stock: req.body.stock ? Number(req.body.stock) : 0
    })
    await newInventory.save({ session });
    await newInventory.populate('product')
    
    await session.commitTransaction();
    await session.endSession();
    
    res.send({
      success: true,
      message: "Sản phẩm đã được tạo thành công",
      data: newInventory
    });
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    res.status(400).send({
      success: false,
      message: error.message || "Failed to create product"
    });
  }
})
router.put('/:id', async function (req, res, next) {
  //cach 1
  // try {
  //   let id = req.params.id;
  //   let result = await productModel.findById(id);
  //   if (!result || result.isDeleted) {
  //     res.status(404).send({
  //       message: "ID NOT FOUND"
  //     });
  //   } else {
  //     let keys = Object.keys(req.body);
  //     for (const key of keys) {
  //       result[key] = req.body[key];
  //     }
  //     await result.save();
  //     res.send(result)
  //   }
  // } catch (error) {
  //   res.status(404).send({
  //     message: "ID NOT FOUND"
  //   });
  // }
  //cach 2
  try {
    let id = req.params.id;
    if (req.body.title) {
      req.body.slug = slugify(req.body.title, {
        replacement: '-',
        remove: undefined,
        lower: true
      });
    }
    let result = await productModel.findByIdAndUpdate(
      id, req.body, {
      new: true
    })
    res.send(result)
  } catch (error) {
    res.status(404).send(error)
  }
})
router.delete('/:id', async function (req, res, next) {
  try {
    let id = req.params.id;
    let result = await productModel.findById(id);
    if (!result || result.isDeleted) {
      res.status(404).send({
        message: "ID NOT FOUND"
      });
    } else {
      result.isDeleted = true;
      await result.save();
      res.send(result)
    }
  } catch (error) {
    res.status(404).send({
      message: "ID NOT FOUND"
    });
  }
})
module.exports = router;

