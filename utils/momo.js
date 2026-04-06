const crypto = require("crypto");
const https = require("https");

/**
 * Tạo chữ ký HMAC-SHA256 theo chuẩn MoMo.
 * Chuỗi ký có dạng: key1=value1&key2=value2&... (sắp xếp theo alphabetical order đã quy định)
 */
function createSignature(rawData) {
  const secretKey = process.env.MOMO_SECRET_KEY;
  return crypto.createHmac("sha256", secretKey).update(rawData).digest("hex");
}

/**
 * Gọi API MoMo để tạo URL thanh toán.
 * @param {object} params
 * @param {string} params.orderId  - Mã đơn hàng (duy nhất)
 * @param {number} params.amount   - Số tiền (VND, số nguyên)
 * @param {string} params.orderInfo - Thông tin đơn hàng
 * @returns {Promise<{payUrl: string, shortLink: string}>}
 */
async function createPaymentUrl({ orderId, amount, orderInfo }) {
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey   = process.env.MOMO_ACCESS_KEY;
  const redirectUrl = process.env.MOMO_RETURN_URL;
  const ipnUrl      = process.env.MOMO_IPN_URL;
  const apiUrl      = process.env.MOMO_API_URL;
  const requestType = "payWithMethod";
  const requestId   = orderId; // Dùng orderId làm requestId cho đơn giản
  const extraData   = "";       // Để trống nếu không có dữ liệu bổ sung

  // Chuỗi ký theo đúng thứ tự quy định của MoMo
  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${partnerCode}` +
    `&redirectUrl=${redirectUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;

  const signature = createSignature(rawSignature);

  const requestBody = JSON.stringify({
    partnerCode,
    partnerName: "MenShop",
    storeId: "MenShopStore",
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang: "vi",
    requestType,
    autoCapture: true,
    extraData,
    signature,
  });

  return new Promise((resolve, reject) => {
    const apiUrlObj = new URL(apiUrl);
    const options = {
      hostname: apiUrlObj.hostname,
      port: 443,
      path: apiUrlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const parsed = JSON.parse(data);
        if (parsed.resultCode === 0) {
          resolve({ payUrl: parsed.payUrl, shortLink: parsed.shortLink });
        } else {
          reject(new Error(`MoMo error: ${parsed.message} (resultCode: ${parsed.resultCode})`));
        }
      });
    });

    req.on("error", reject);
    req.write(requestBody);
    req.end();
  });
}

/**
 * Xác thực chữ ký từ callback/IPN của MoMo.
 * @param {object} params - Toàn bộ query params hoặc body từ MoMo callback
 * @returns {boolean}
 */
function verifyCallback(params) {
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;

  const {
    accessKey: _accessKey,
    amount,
    extraData,
    message,
    orderId,
    orderInfo,
    orderType,
    partnerCode,
    payType,
    requestId,
    responseTime,
    resultCode,
    transId,
    signature: receivedSignature,
  } = params;

  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&message=${message}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&orderType=${orderType}` +
    `&partnerCode=${partnerCode}` +
    `&payType=${payType}` +
    `&requestId=${requestId}` +
    `&responseTime=${responseTime}` +
    `&resultCode=${resultCode}` +
    `&transId=${transId}`;

  const expectedSignature = createSignature(rawSignature);
  return receivedSignature === expectedSignature;
}

module.exports = { createPaymentUrl, verifyCallback };
