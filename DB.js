const mongoose = require('mongoose');
require("dotenv").config();

const mongoURL = process.env.MONGO_URL;

const connectToMongo = async () => {
  try {
    await mongoose.connect(mongoURL);
    console.log('connected to mongoose');
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = connectToMongo;
