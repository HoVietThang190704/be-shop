let express = require('express');
let router = express.Router();
const { CheckLogin } = require('../utils/authHandler');
const orderModel = require('../schemas/orders');
const cartModel = require('../schemas/carts');
const inventoryModel = require('../schemas/inventories');
const momo = require('../utils/momo');


// POST /api/v1/orders
router.post('/', CheckLogin, async (req, res) => {
  const user = req.user;
  const { shippingAddress, paymentMethod } = req.body;

  try {
    // lay gio hang va thong tin san pham
    const cart = await cartModel.findOne({ user: user._id }).populate('products.product');
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // kiem tra ton kho va tinh tong tien
    const orderItems = [];
    let totalAmount = 0;

    for (const item of cart.products) {
      const product = item.product;
      const inventory = await inventoryModel.findOne({ product: product._id });
      const availableStock = inventory ? inventory.stock - inventory.reserved : 0;

      if (availableStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.title}" không đủ hàng trong kho`,
        });
      }

      orderItems.push({ product: product._id, quantity: item.quantity, price: product.price });
      totalAmount += product.price * item.quantity;
    }

    // tao don hang (trang thai: pending)
    const orderId = `ORD${Date.now()}`;
    const order = new orderModel({
      user: user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      totalAmount,
      txnRef: orderId,
    });
    await order.save();

    // tam giu hang trong kho
    for (const item of cart.products) {
      await inventoryModel.findOneAndUpdate(
        { product: item.product._id },
        { $inc: { reserved: item.quantity } }
      );
    }

    // xu ly theo phuong thuc thanh toan
    if (paymentMethod === 'MOMO') {
      const { payUrl } = await momo.createPaymentUrl({
        orderId,
        amount: Math.round(totalAmount),
        orderInfo: `Thanh toan don hang ${orderId}`,
      });

      return res.status(200).json({
        success: true,
        message: 'Order created. Redirecting to MoMo payment...',
        data: { paymentUrl: payUrl, orderId: order._id },
      });
    }

    // COD: xac nhan don ngay va xoa gio hang
    await cartModel.findOneAndUpdate({ user: user._id }, { $set: { products: [] } });
    order.orderStatus = 'confirmed';
    await order.save();

    return res.json({ success: true, message: 'Order placed successfully (COD)', orderId: order._id });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// GET /api/v1/orders/momo-return
router.get('/momo-return', CheckLogin, async (req, res) => {
  try {
    const params = req.query;
    const { resultCode, orderId, transId } = params;

    // xac thuc chu ky de dam bao du lieu khong bi gia mao
    const isValid = momo.verifyCallback(params);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid signature from MoMo' });
    }

    const order = await orderModel.findOne({ txnRef: orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // tranh xu ly trung lap neu IPN da xu ly truoc do
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'Order already confirmed', orderId: order._id });
    }

    if (String(resultCode) === '0') {
      // thanh toan thanh cong
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      order.transId = transId;
      await order.save();

      // xoa gio hang
      await cartModel.findOneAndUpdate(
        { user: order.user },
        { $set: { products: [] } }
      );

      // cap nhat kho: deducted stock, giai phong reserved
      for (const item of order.items) {
        await inventoryModel.findOneAndUpdate(
          { product: item.product },
          { $inc: { stock: -item.quantity, reserved: -item.quantity, soldCount: item.quantity } }
        );
      }

      return res.json({ success: true, message: 'Payment confirmed successfully', orderId: order._id });
    } else {
      // thanh toan that bai hoac bi huy
      order.paymentStatus = 'failed';
      order.orderStatus = 'cancelled';
      await order.save();

      // giai phong hang da giu
      for (const item of order.items) {
        await inventoryModel.findOneAndUpdate(
          { product: item.product },
          { $inc: { reserved: -item.quantity } }
        );
      }

      return res.json({ success: false, message: 'Payment was cancelled or failed', resultCode });
    }
  } catch (error) {
    console.error('MoMo return handler error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// IPN tu MoMo server → server
router.post('/momo-ipn', async (req, res) => {
  try {
    const params = req.body;
    const isValid = momo.verifyCallback(params);

    if (!isValid) {
      return res.status(200).json({ resultCode: 1, message: 'Invalid signature' });
    }

    const { orderId, resultCode, transId } = params;
    const order = await orderModel.findOne({ txnRef: orderId });

    if (!order) {
      return res.status(200).json({ resultCode: 1, message: 'Order not found' });
    }

    if (resultCode === 0 && order.paymentStatus !== 'paid') {
      // thanh toan thanh cong
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      order.transId = transId;
      await order.save();

      await cartModel.findOneAndUpdate({ user: order.user }, { $set: { products: [] } });

      for (const item of order.items) {
        await inventoryModel.findOneAndUpdate(
          { product: item.product },
          { $inc: { stock: -item.quantity, reserved: -item.quantity, soldCount: item.quantity } }
        );
      }
    } else if (resultCode !== 0) {
      // thanh toan that bai / huy
      order.paymentStatus = 'failed';
      order.orderStatus = 'cancelled';
      await order.save();

      for (const item of order.items) {
        await inventoryModel.findOneAndUpdate(
          { product: item.product },
          { $inc: { reserved: -item.quantity } }
        );
      }
    }

    return res.status(200).json({ resultCode: 0, message: 'Confirmed' });

  } catch (error) {
    console.error('MoMo IPN error:', error);
    res.status(500).json({ resultCode: 1, message: 'Internal server error' });
  }
});

// GET /api/v1/orders
router.get('/', CheckLogin, async (req, res) => {
  try {
    const orders = await orderModel.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

module.exports = router;
