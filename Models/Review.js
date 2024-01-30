const mongoose = require('mongoose');
const { Schema } = mongoose;

const BeauticianReviewSchema = new Schema({
    Beautician:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Beautician'
    },
    User:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    },
    Rating:{
        type:String,
        required:true
    },
    Description:{
        type:String,
        required:true
    },
    Date:{
        type:Date,
        default:new Date
    }
})

const Reviews = mongoose.model("Reviews", BeauticianReviewSchema)
module.exports = Reviews