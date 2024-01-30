const jwt = require('jsonwebtoken')
const JWT_KEY = process.env.JWT_KEY;;

const fetchbeautician = (req,res,next)=>{

    const Token = req.header('beauticianCRSFToken')
    if(!Token)
    {
        res.status(401).send({error:"Please authenticate token"})
    }

    try {
        const data = jwt.verify(Token,JWT_KEY)
        req.beautician=data.beautician;
        
        next();
        
    } catch (error) {
        res.status(401).send({error:"Please authenticate token"})
    }

   

}

module.exports = fetchbeautician;