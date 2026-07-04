// import mongoose library
const mongoose = require("mongoose");
// import bcrypt library
const bcrypt = require("bcryptjs");

/**
 * userSchema = @Entity User in Spring Boot
 * Following fields: username, email, password, avatarUrl
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true, // removes spaces if user types a username with spaces
      minlength: 2,
      maxlength: 20,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false, // automatically hide password field when we fetch user unless we specify
    },
    avatarUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }, // automatically creates createdAt and updatedAt fields
);

// .pre("save") = before saving a user, run this code before actually save
userSchema.pre("save", async function () {
  // if password hasnt' changed, no need to hash again so skip
  // this = current user
  if (!this.isModified("password")) return;

  // if password changes
  // salt adds randomness to so that 2 same passwords still get different hashes
  // 10 = rounds, higher number is better
  const salt = await bcrypt.genSalt(10);

  // update this user's password by hasing with salt
  this.password = await bcrypt.hash(this.password, salt);
});

// a custom method to compare typed password with this user's password
userSchema.methods.comparePassword = async function (typedPassword) {
  return bcrypt.compare(typedPassword, this.password);
};

// export User Mongoose model
/** Mongoose model "User" = UserRepository in SpringBoot
 * With Mongoose, the following functions are automatically created:
 * User.create()
 * User.findOne()
 * User.findById()
 * User.deleteOne()
 */
module.exports = mongoose.model("User", userSchema);
