const mongoose = require('mongoose');
const { Schema } = mongoose;

const BeauticianServiceSchema = new Schema({
    Beautician:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Beautician'
    },
    Category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category'
    },
    Types: [
        {
            Name: {
                type: String,
                required: true
            },
            Price: {
                type: String,
                required:true
            }
        }
    ],

})

const Service = mongoose.model("Service", BeauticianServiceSchema)
module.exports = Service