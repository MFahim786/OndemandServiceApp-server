const mongoose = require('mongoose');
const { Schema } = mongoose;

const FavrioteSchema = new Schema({
    Beautician:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Beautician'
    },
    User:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    }
})

const Favriote = mongoose.model("Favriote", FavrioteSchema)
module.exports = Favriote