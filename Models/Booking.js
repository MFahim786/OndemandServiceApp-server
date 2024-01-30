const mongoose = require('mongoose');
const { Schema } = mongoose;

const BookingSchema = new Schema({
    Beautician:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Beautician'
    },
    User:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    },
    Service:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Service'
        }
    ],
    Payment:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Payment'
    },
    BookingTime:{
        Date:{
            type:String
        },
        Month:{
            type:String
        },
        Time:{
            type:String
        }
    },
    TotalAmount:{
        type:String
    },
    Status:{
        type:String
    }  
})

const Booking = mongoose.model("Booking", BookingSchema)
module.exports = Booking