const mongoose = require('mongoose');
const { Schema } = mongoose;

const BeauticianSchema = new Schema({
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
    PhoneNo:{
        type:String
    },
    Gender:{
        type:String
    },
    Is_Verfied:{
        type:Boolean,
        default:false
    },
    Status:{
        type:String
    },
    CNIC:{
        type:String
    },
    CNIC_Front:{
        type:String
    },
    CNIC_Back:{
        type:String
    },
    ProfiePhoto:{
        type:String,
    }, 
    Password:{
        type:String,
        required:true
    },
    Date:{
        type:Date,
        default:new Date
    },
    Location:{
        lan:{
            type:String
        },
        lat:{
            type:String
        }
    },
    address:{
        type:String
    }
})

 const Beautician =mongoose.model("Beautician",BeauticianSchema)
module.exports = Beautician