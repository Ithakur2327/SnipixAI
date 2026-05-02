import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser } from "../types";

const UserSchema = new Schema<IUser>(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    plan:         { type: String, enum: ["free", "pro"], default: "free" },
    usageCount:   { type: Number, default: 0 },
    usageLimit:   { type: Number, default: 10 },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre("save", async function (next) {
  const user = this as any;
  if (!user.isModified("passwordHash")) return next();
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, (this as any).passwordHash);
};

// Public JSON
UserSchema.methods.toPublicJSON = function () {
  const user = (this as any).toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

export const User = mongoose.model<IUser>("User", UserSchema);