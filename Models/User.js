const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    Username:{
        type:String,
        required:true
    },
    FirstName:{
        type:String,
    },
    LastName:{
        type:String,
    },
    Email:{
        type:String,
        required:true,
        unique:true
    },
    Is_Verfied:{
        type:Boolean,
        default:false
    },
    CNIC:{
        type:String
    },
    ProfiePhoto:{
        type:String,
    },
    PhoneNo:{
        type:String
    },
    Password:{
        type:String,
        required:true
    },
    Date:{
        type:Date,
        default:new Date
    },
    Address:{
        type:String
    },
    City:{
        type:String
    },
    usedPromotions: [
        {
            PromoID:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'Promotion'
            },
            promoCode: {
                type:String
            },
            usageCount:{
                type:Number
            }
        },
    ],
})

 const user =mongoose.model("user",userSchema)
module.exports = user