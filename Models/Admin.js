const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdminSchema = new Schema({
    Username:{
        type:String,
        required:true
    },
    Name:{
        type:String,
    },
    Email:{
        type:String,
        required:true,
        unique:true
    },
    Password:{
        type:String,
        required:true
    },
    Date:{
        type:Date,
        default:new Date
    }
})

 const admin =mongoose.model("Admin",AdminSchema)
module.exports = admin