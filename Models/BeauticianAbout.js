const mongoose = require('mongoose');
const { Schema } = mongoose;

const BeauticianAboutSchema = new Schema({
    Beautician:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Beautician'
    },
    AboutData: {
        Type: String
    },
    Timings: [
        {
            day: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                required: true
            },
            isOpen: {
                type: Boolean,
                default: true
            },
            openTime: {
                type: String,
                required: function () {
                    return this.isOpen;
                }
            },
            closeTime: {
                type: String,
                required: function () {
                    return this.isOpen;
                }
            }
        }
    ],
    Contact: {
        Address: {
            type: String,
        }
    }
})

const About = mongoose.model("About", BeauticianAboutSchema)
module.exports = About