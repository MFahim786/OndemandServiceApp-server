const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmailSchema = new Schema({
    UserID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    },
    OTP:{
        type:String,
        require:true
    },
    createdAt:{
        type:Date
    },
    expireAt:{
        type:Date
    }

})

const otps =mongoose.model("otps",EmailSchema)
module.exports = otps