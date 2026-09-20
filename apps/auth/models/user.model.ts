

import { Schema, model } from "mongoose";

const userSchema = new Schema({
    firebaseUID: {
        type: String,
        unique: true,
    },
    name: String,
    email: String,
    avatar: String,

}, {
    timestamps: true
})  


const User = model("User" , userSchema);

export default User;