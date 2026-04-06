var express = require("express");
var router = express.Router();
let { validatedResult, CreateAnUserValidator, ModifyAnUserValidator } = require('../utils/validator')
let userModel = require("../schemas/users");
let userController = require('../controllers/users')
let { CheckLogin, CheckRole } = require('../utils/authHandler')
let { uploadImage } = require('../utils/uploadHandler')

router.patch("/profile", CheckLogin, uploadImage.single('avatar'), async function (req, res, next) {
    try {
        let updateData = {
            fullName: req.body.fullName,
            email: req.body.email
        };

        if (req.file) {
            updateData.avatarUrl = "uploads/" + req.file.filename;
        }

        // Clean up undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        let updatedUser = await userController.UpdateAnUser(req.user._id, updateData);
        res.send({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

let roleModel = require("../schemas/roles");

router.get("/admins/first", async function (req, res, next) {
    try {
        let adminRole = await roleModel.findOne({ name: "ADMIN" });
        if (!adminRole) return res.status(404).send({ message: "Admin role not found" });

        let firstAdmin = await userModel.findOne({ role: adminRole._id, isDeleted: false });
        if (!firstAdmin) return res.status(404).send({ message: "No admin found" });

        res.send(firstAdmin);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

router.get("/", CheckLogin,CheckRole("ADMIN", "USER"), async function (req, res, next) {
    let users = await userModel
      .find({ isDeleted: false })
    res.send(users);
  });

router.get("/admins/first", async function (req, res, next) {
  try {
    // Get all admins (those with role ADMIN), sorted by creation date
    let admins = await userModel.find({ isDeleted: false }).populate('role');
    let admin = admins.find(u => u.role && u.role.name === "ADMIN");
    
    if (admin) {
      res.send(admin);
    } else {
      console.warn("No admin found in database");
      res.status(404).send({ message: "no admin found" });
    }
  } catch (error) {
    console.error("Error fetching admin:", error);
    res.status(500).send({ message: "error fetching admin" });
  }
});

router.get("/:id", async function (req, res, next) {
  try {
    let result = await userModel
      .find({ _id: req.params.id, isDeleted: false })
    if (result.length > 0) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", CreateAnUserValidator, validatedResult, async function (req, res, next) {
  try {
    let newItem = await userController.CreateAnUser(
      req.body.username, req.body.password, req.body.email, req.body.role,
      req.body.fullName, req.body.avatarUrl, req.body.status, req.body.loginCount)
    res.send(newItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", ModifyAnUserValidator, validatedResult, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;