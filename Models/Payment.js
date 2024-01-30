const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentSchema = new Schema({
    TransactionID:{
        type:String
    },
    Amount:{
        type:String
    },
    Status:{
        type:String
    }
})

const Payment = mongoose.model("Payment", PaymentSchema)
module.exports = Payment