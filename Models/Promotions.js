const mongoose = require('mongoose');
const { Schema } = mongoose;

const PromotionSchema = new Schema({
    Heading: {
        type: String
    },
    PercentageOff: {
        type: String
    },
    Intro: {
        type: String
    },
    Description: {
        type: String,
    },
    PromoCode:{
        type: String
    },
    ShoppingLimit: {
        isLimit: {
            type: Boolean,
            default: false
        },
        AmountLimit: {
            type: String,
            required: function () {
                return this.isOpen;
            }
        },
    },
    UsageLimit:{
        isLimit: {
            type: Boolean,
            default: false
        },
        UsageLimit: {
            type: String,
            required: function () {
                return this.isOpen;
            }
        },
    },
    ExpireDate:{
        type:Date
    },
    Date:{
        type:Date,
        default:new Date
    },
    status:{
        type:String
    }
})

const Promotion = mongoose.model("Promotion", PromotionSchema)
module.exports = Promotion