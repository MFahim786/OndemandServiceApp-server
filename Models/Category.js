const mongoose = require('mongoose');
const { Schema } = mongoose;

const CategorySchema = new Schema({
    Name:{
        type:String,
        required:true
    },
    Logo:{
        type:String,
        required:true
    }
})

 const Category =mongoose.model("Category",CategorySchema)
module.exports = Category