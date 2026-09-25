

import { Schema, model } from "mongoose";

const userSchema = new Schema({
    firebaseUID: {
        type: String,
        unique: true,
    },
    name: String,
    email: String,
    avatar: String,
    plan: {
        type: String,
        enum: ["free", "starter", "pro"],
        default: "free",
    },
    credits: {
        type: Number,
        default: 100,
    },
    totalCredits: {
        type: Number,
        default: 100,
    },
    planExpiry: {
        type: Date,
        default: null,
    }
}, {
    timestamps: true
})


const User = model("User", userSchema);

export default User;