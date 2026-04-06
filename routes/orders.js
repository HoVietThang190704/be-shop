let express = require('express');
let router = express.Router();
const { CheckLogin } = require('../utils/authHandler');
const orderModel = require('../schemas/orders');
const cartModel = require('../schemas/carts');
const inventoryModel = require('../schemas/inventories');
const userModel = require('../schemas/users');
const voucherModel = require('../schemas/vouchers');
const momo = require('../utils/momo');

const REWARD_RATE = 0.05;
const MIN_REDEEM_POINTS = 1000;
const VOUCHER_EXPIRE_DAYS = 30;

function calculateRewardPoints(amount) {
  return Math.max(0, Math.floor(amount * REWARD_RATE));
}

function isVoucherExpired(voucher) {
  return new Date(voucher.expiresAt).getTime() <= Date.now();
}

function generateVoucherCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `RW-${timestamp}-${randomPart}`;
}

async function creditRewardPoints(order) {
  if (order.rewardPointsCredited) {
    return order.rewardPointsEarned || 0;
  }

  const earnedPoints = calculateRewardPoints(order.totalAmount);

  if (earnedPoints > 0) {
    await userModel.findByIdAndUpdate(order.user, { $inc: { rewardPoints: earnedPoints } });
  }

  order.rewardPointsEarned = earnedPoints;
  order.rewardPointsCredited = true;
  await order.save();
  return earnedPoints;
}

async function markVoucherRedeemed(order) {
  if (!order.voucherId) {
    return;
  }

  const voucher = await voucherModel.findById(order.voucherId);
  if (!voucher || voucher.status === 'redeemed') {
    return;
  }

  voucher.status = 'redeemed';
  voucher.redeemedAt = new Date();
  voucher.order = order._id;
  await voucher.save();
}

async function releaseVoucher(order) {
  if (!order.voucherId) {
    return;
  }

  const voucher = await voucherModel.findById(order.voucherId);
  if (!voucher || voucher.status !== 'locked') {
    return;
  }

  if (isVoucherExpired(voucher)) {
    voucher.status = 'expired';
  } else {
    voucher.status = 'active';
    voucher.order = null;
    voucher.lockedAt = null;
  }

  await voucher.save();
}

async function finalizePaidOrder(order, transId) {
  if (order.paymentStatus === 'paid') {
    await markVoucherRedeemed(order);
    return creditRewardPoints(order);
  }

  order.paymentStatus = 'paid';
  order.orderStatus = 'confirmed';
  if (transId) {
    order.transId = transId;
  }
  await order.save();

  await cartModel.findOneAndUpdate(
    { user: order.user },
    { $set: { products: [] } }
  );

  for (const item of order.items) {
    await inventoryModel.findOneAndUpdate(
      { product: item.product },
      { $inc: { stock: -item.quantity, reserved: -item.quantity, soldCount: item.quantity } }
    );
  }

  await markVoucherRedeemed(order);
  return creditRewardPoints(order);
}

async function finalizeFailedOrder(order) {
  if (order.paymentStatus === 'failed') {
    await releaseVoucher(order);
    return;
  }

  order.paymentStatus = 'failed';
  order.orderStatus = 'cancelled';
  await order.save();

  for (const item of order.items) {
    await inventoryModel.findOneAndUpdate(
      { product: item.product },
      { $inc: { reserved: -item.quantity } }
    );
  }

  await releaseVoucher(order);
}


// POST /api/v1/orders
router.post('/', CheckLogin, async (req, res) => {
  const user = req.user;
  const { shippingAddress, paymentMethod, discountCode } = req.body;
  const selectedPaymentMethod = paymentMethod || 'COD';

  try {
    // lay gio hang va thong tin san pham
    const cart = await cartModel.findOne({ user: user._id }).populate('products.product');
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // kiem tra ton kho va tinh tong tien
    const orderItems = [];
    let subtotalAmount = 0;

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
      subtotalAmount += product.price * item.quantity;
    }

    let voucher = null;
    let discountAmount = 0;

    if (discountCode) {
      const normalizedCode = String(discountCode).trim().toUpperCase();
      voucher = await voucherModel.findOne({
        code: normalizedCode,
        user: user._id,
        status: 'active',
      });

      if (!voucher) {
        return res.status(400).json({ success: false, message: 'Invalid or unavailable voucher code' });
      }

      if (isVoucherExpired(voucher)) {
        voucher.status = 'expired';
        await voucher.save();
        return res.status(400).json({ success: false, message: 'Voucher has expired' });
      }

      discountAmount = Math.min(voucher.discountAmount, subtotalAmount);
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount);

    if (selectedPaymentMethod !== 'COD' && selectedPaymentMethod !== 'MOMO') {
      return res.status(400).json({ success: false, message: 'Unsupported payment method' });
    }

    // tao don hang (trang thai: pending)
    const orderId = `ORD${Date.now()}`;
    const order = new orderModel({
      user: user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: selectedPaymentMethod,
      totalAmount,
      subtotalAmount,
      discountAmount,
      voucherCode: voucher ? voucher.code : undefined,
      voucherId: voucher ? voucher._id : undefined,
      txnRef: orderId,
    });
    await order.save();

    if (voucher) {
      voucher.status = 'locked';
      voucher.lockedAt = new Date();
      voucher.order = order._id;
      await voucher.save();
    }

    // tam giu hang trong kho
    for (const item of cart.products) {
      await inventoryModel.findOneAndUpdate(
        { product: item.product._id },
        { $inc: { reserved: item.quantity } }
      );
    }

    // xu ly theo phuong thuc thanh toan
    if (selectedPaymentMethod === 'MOMO') {
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

    // COD: xu ly thanh toan va hoan tat don ngay
    const earnedPoints = await finalizePaidOrder(order);

    return res.json({
      success: true,
      message: 'Order placed successfully (COD)',
      orderId: order._id,
      earnedPoints,
    });

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
      const earnedPoints = await finalizePaidOrder(order, transId);
      return res.json({
        success: true,
        message: 'Payment confirmed successfully',
        orderId: order._id,
        earnedPoints,
      });
    } else {
      // thanh toan that bai hoac bi huy
      await finalizeFailedOrder(order);

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

    if (String(resultCode) === '0' && order.paymentStatus !== 'paid') {
      // thanh toan thanh cong
      await finalizePaidOrder(order, transId);
    } else if (String(resultCode) !== '0' && order.paymentStatus !== 'paid') {
      // thanh toan that bai / huy
      await finalizeFailedOrder(order);
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
      .populate('voucherId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// GET /api/v1/orders/rewards/summary
router.get('/rewards/summary', CheckLogin, async (req, res) => {
  try {
    await voucherModel.updateMany(
      {
        user: req.user._id,
        status: { $in: ['active', 'locked'] },
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: 'expired' } }
    );

    const user = await userModel.findById(req.user._id).select('rewardPoints');
    const vouchers = await voucherModel
      .find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('code pointsCost discountAmount status expiresAt redeemedAt createdAt');

    return res.json({
      success: true,
      data: {
        rewardPoints: user ? user.rewardPoints : 0,
        conversion: '1 point = 1 VND discount',
        minRedeemPoints: MIN_REDEEM_POINTS,
        vouchers,
      },
    });
  } catch (error) {
    console.error('Fetch reward summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch reward summary' });
  }
});

// POST /api/v1/orders/rewards/redeem
router.post('/rewards/redeem', CheckLogin, async (req, res) => {
  try {
    const points = Number(req.body.points);
    if (!Number.isInteger(points) || points < MIN_REDEEM_POINTS) {
      return res.status(400).json({
        success: false,
        message: `Points must be an integer and at least ${MIN_REDEEM_POINTS}`,
      });
    }

    const user = await userModel.findOneAndUpdate(
      {
        _id: req.user._id,
        rewardPoints: { $gte: points },
      },
      {
        $inc: { rewardPoints: -points },
      },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ success: false, message: 'Not enough reward points' });
    }

    const expiresAt = new Date(Date.now() + VOUCHER_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
    let voucher = null;

    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateVoucherCode();
        try {
          voucher = await voucherModel.create({
            user: req.user._id,
            code,
            pointsCost: points,
            discountAmount: points,
            expiresAt,
          });
          break;
        } catch (error) {
          if (error && error.code === 11000) {
            continue;
          }
          throw error;
        }
      }

      if (!voucher) {
        throw new Error('Failed to generate voucher code');
      }
    } catch (error) {
      await userModel.findByIdAndUpdate(req.user._id, { $inc: { rewardPoints: points } });
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Redeem successful',
      data: {
        voucherCode: voucher.code,
        discountAmount: voucher.discountAmount,
        pointsUsed: voucher.pointsCost,
        pointsLeft: user.rewardPoints,
        expiresAt: voucher.expiresAt,
      },
    });
  } catch (error) {
    console.error('Redeem voucher error:', error);
    return res.status(500).json({ success: false, message: 'Failed to redeem points' });
  }
});

module.exports = router;
