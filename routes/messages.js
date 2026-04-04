var express = require('express');
var router = express.Router();
let { CheckLogin } = require('../utils/authHandler')
let { uploadImage } = require('../utils/uploadHandler')
let messageSchema = require('../schemas/messages');
let userSchema = require('../schemas/users');


router.post('/', CheckLogin, uploadImage.single('file'), async function (req, res, next) {
    let user01 = req.user._id;
    let user02 = req.body.to;
    let getUser02 = await userSchema.findById(user02);
    if (!getUser02) {
        res.status(404).send({
            message: "user khong ton tai"
        })
        return;
    }
    let message = {}
    if (req.file) {
        message.type = 'file';
        message.text = req.file.path
    } else {
        message.type = 'text';
        message.text = req.body.text
    }
    let newMess = new messageSchema({
        to: user02,
        from: user01,
        messageContent: message
    })
    await newMess.save();
    res.send(newMess);
})
router.get('/:userid', CheckLogin, async function (req, res, next) {
    let user01 = req.user._id;
    let user02 = req.params.userid;
    let getUser02 = await userSchema.findById(user02);
    if (!getUser02) {
        res.status(404).send({
            message: "user khong ton tai"
        })
        return;
    }
    let messages = await messageSchema.find({
        $or: [
            {
                from: user01,
                to: user02
            }, {
                to: user01,
                from: user02
            }
        ]
    }).sort({
        createdAt: -1
    })
    res.send(messages)
})
router.get('/', CheckLogin, async function (req, res, next) {
    let user01 = req.user._id;
    let messages = await messageSchema.find({
        $or: [
            {
                from: user01
            }, {
                to: user01
            }
        ]
    }).sort({
        createdAt: -1
    })
    let messageMap = new Map();
    for (const message of messages) {
        let user02 = user01.toString() == message.from.toString() ? message.to.toString() : message.from.toString()
        if (!messageMap.has(user02)) {
            messageMap.set(user02, message)
        }
    }
    let result = [];
    messageMap.forEach(
        function (value, key) {
            result.push({
                user: key,
                message: value
            })
        }
    )
    res.send(result)
})

module.exports = router;