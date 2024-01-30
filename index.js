const connectToMongo = require("./DB");
const express = require('express')
var cors = require('cors');
require("dotenv").config();


connectToMongo()

const app = express()
const port = 5000

app.use(cors())
app.use(express.json())

app.use('/api/adminAuth', require('./Routes/Admin'));
app.use('/api/userAuth', require('./Routes/User'));
app.use('/api/beauticianAuth', require('./Routes/Beautician'));

app.listen(port, () => {
  console.log(`Inote-book listening at http://localhost:${port}`)
})

