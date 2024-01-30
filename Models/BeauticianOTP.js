const mongoose = require('mongoose');
const { Schema } = mongoose;

const BeauticianEmailSchema = new Schema({
    BeauticianID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Beautician'
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

const Beauticianotps =mongoose.model("Beauticianotps",BeauticianEmailSchema)
module.exports = Beauticianotps