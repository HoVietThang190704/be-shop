const express = require('express');
const router = express.Router();
const { CheckLogin } = require('../utils/authHandler');
const userModel = require('../schemas/users');
const voucherModel = require('../schemas/vouchers');

const MIN_REDEEM_POINTS = 1000;
const VOUCHER_EXPIRE_DAYS = 30;

function generateVoucherCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `RW-${timestamp}-${randomPart}`;
}

// GET /api/v1/rewards/summary
router.get('/summary', CheckLogin, async (req, res) => {
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

// GET /api/v1/rewards/vouchers
router.get('/vouchers', CheckLogin, async (req, res) => {
  try {
    await voucherModel.updateMany(
      {
        user: req.user._id,
        status: { $in: ['active', 'locked'] },
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: 'expired' } }
    );

    const vouchers = await voucherModel
      .find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('code pointsCost discountAmount status expiresAt redeemedAt createdAt');

    return res.json({ success: true, data: vouchers });
  } catch (error) {
    console.error('Fetch vouchers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch vouchers' });
  }
});

// POST /api/v1/rewards/redeem
router.post('/redeem', CheckLogin, async (req, res) => {
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
