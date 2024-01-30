const express = require("express");
const User = require("../Models/User");
const OTP = require("../Models/EmailOtp");
const Review = require("../Models/Review");
const router = express.Router();
const fetchuser = require('../midelware/Fetchuser')
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer')
const geoip = require('geoip-lite');
const multer = require('multer');
const Category = require("../Models/Category");
const Promotion = require("../Models/Promotions");
const Beautician = require("../Models/Beautician");
const Reviews = require("../Models/Review");
const Favriote = require("../Models/Favorite");
const About = require("../Models/BeauticianAbout");
const Service = require("../Models/Services");

const upload = multer({ storage: multer.memoryStorage() });

const JWT_KEY = process.env.JWT_KEY;


let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: 'ipocryptos@gmail.com', // Your Gmail email address
        pass: 'ixbw rudr efft hedl', // Your Gmail app password or an app-specific password
    },
})

const sendOTPEmail = async (id, email, res) => {
    try {
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`

        const mailOptions = {
            from: "ipocryptos@gmail.com",
            to: email,
            subject: `Verify Your Email`,
            html: `<p>Enter <b>${otp}</b> in the app to verify your email address and complete the proccess of Signup</p>
            <p>This OTP will expire in 15 Minute</p>`
        }


        const saltRounds = 10;
        const hashedOTP = await bcrypt.hash(otp, saltRounds)

        await OTP.deleteMany({ UserID: id });

        const otpresponse = await OTP.create({
            UserID: id,
            OTP: hashedOTP,
            createdAt: new Date(),
            expireAt: new Date(Date.now() + 240000)
        })

        await transporter.sendMail(mailOptions)

        return {
            status: "Pending",
            message: "Verification otp email send",
        };
    } catch (error) {
        console.log(error)
        return {
            status: "Failed",
            message: error.message,
        };
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
}

//Create a user 
router.post("/createuser", async (req, res) => {
    console.log(req.body,"username is in backend side");
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
    }

    try {
        let user = await User.findOne({ $or: [ { Username: req.body.Username }, { Email: req.body.Email } ] });

        if (user) {
            console.log("User already exists   ")   
            return res.status(404).json({ error: "This Email or username already exist" })
        }
    
 

        const Salt = await bcrypt.genSalt(10);
        const SecPassword = await bcrypt.hash(req.body.Password, Salt)
        user = await User.create({
            FirstName: req.body.FirstName,
            LastName: req.body.LastName,
            Email: req.body.Email, 
            Username: req.body.Username,
            PhoneNo: req.body.PhoneNo,
            Password: SecPassword
        }) 
 
        const response = await sendOTPEmail(user.id, req.body.Email, res);

        const data = {
            user: {
                id: user.id,
            }
        } 
        const AuthToken = jwt.sign(data, JWT_KEY);

        success = true;
        res.json({ success, AuthToken, response })

    } catch (error) {
        console.error(error)
        res.status(500).send('error occured')
    }
})

//Verify OTP
router.post("/verifyOTP", async (req, res) => {
    try {
        let { token, otp } = req.body;
        const password = jwt.verify(token, JWT_KEY);
        const userID = password.user.id;
        if (!userID || !otp) {
            res.json({
                status: "Failed",
                message: "Empty otp details are not allowed"
            });
        } else {
            const otpVerification = await OTP.findOne({ UserID: userID });

            if (!otpVerification) {
                res.json({
                    success: false,
                    message: "Account record doesn't exist"
                });
            } else {
                const { expireAt } = otpVerification;
                const hashedOTP = otpVerification.OTP;

                if (expireAt < new Date()) {
                    await OTP.deleteMany({ UserID: userID });
                    res.json({
                        success: false,
                        message: "Code has expired. Please request again"
                    });
                } else {
                    const validOTP = await bcrypt.compare(otp, hashedOTP);
                    if (!validOTP) {
                        res.json({
                            success: false,
                            message: "Invalid code passed. Check your inbox"
                        });
                    } else {
                        await User.updateOne({ _id: userID }, { Is_Verfied: true });
                        await OTP.deleteMany({ UserID: userID });

                        res.json({
                            success: true,
                            message: "User Email verified successfully"
                        });
                    }
                }
            }
        }
    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
});

//Send OTP Again
router.post("/SendOTPagain", async (req, res) => {
    try {
        const { token } = req.body;
        const password = jwt.verify(token, JWT_KEY);
        const userID = password.user.id;

        // Delete existing OTP verification document
        await OTP.deleteMany({ UserID: userID });

        // Fetch user data by userID
        const user = await User.findOne({ _id: userID });

        if (!user) {
            res.json({
                success: false,
                message: "User not found"
            });
            return;
        }

        const email = user.Email;

        // Send new OTP email
        await sendOTPEmail(userID, email);

        res.json({
            success: true,
            message: "OTP Sent Successfully"
        });
    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
}); 

//Login a user
router.post("/loginuser", async (req, res) => {
    let success = false;
 console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
 
    const { UserName, Password } = req.body;

    try {
        let user = await User.findOne({ Username: UserName })
        if (!user) {
            return res.status(400).json({ Message: "Account doesn't Fined" })
        }

        const passwordCompare = await bcrypt.compare(Password, user.Password)

        if (!passwordCompare) {
            return res.status(400).json({ Message: "UserName or Password Does not Find" })
        }

        const Payload = {
            user: {
                id: user.id,
            }
        }
        const AuthToken = jwt.sign(Payload, JWT_KEY);
        success = true;
        if (!user.Is_Verfied) {
            await sendOTPEmail(user._id, user.Email);
            return res.json({ success: true, Email: false, Message: "Email Verification Required", AuthToken });
        }

        res.json({ success, AuthToken })

    } catch (error) {
        console.error(error)
        res.status(500).send('error occured')
    }
})

router.put("/UpProImg", upload.single('Proimg'), async (req, res) => {
    try {
        const token = req.body.token;
        const imageBuffer = req.file.buffer;
        const image = imageBuffer.toString('base64');

        const password = jwt.verify(token, JWT_KEY);
        const id = password.user.id;

        await User.findOneAndUpdate(
            { _id: id },
            { ProfiePhoto: image }
        );


        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred');
    }
});

router.get("/getuser", fetchuser, async (req, res) => {
    try {
        let userid = req.user.id;
        const user = await User.findById({ _id: userid });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }


        if (!user.ProfiePhoto) {
            const userData = { ...user.toObject(), ProfiePhoto: undefined };
            res.json({ success: true, userData: userData });

        } else {
            const imageDataUri = `data:image/png;base64,${user.ProfiePhoto}`;
            const userData = { ...user.toObject(), ProfiePhoto: imageDataUri };
            res.json({ success: true, userData: userData });
        }


    } catch (error) {
        console.error(error)
        res.status(500).send('error occured')
    }
})

router.get("/getProImg", fetchuser, async (req, res) => {
    try {
        let userid = req.user.id;
        const user = await User.findById({ _id: userid }).select("ProfiePhoto");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }


        if (!user.ProfiePhoto) {
            res.json({ success: true, ImageData: false });

        } else {
            const imageDataUri = `data:image/png;base64,${user.ProfiePhoto}`;
            const userData = { ...user.toObject(), ProfiePhoto: imageDataUri };
            res.json({ success: true, ImageData: true, userData: userData });
        }


    } catch (error) {
        console.error(error)
        res.status(500).send('error occured')
    }
})

router.put("/UpdateUser", fetchuser, async (req, res) => {
    try {
        const { FirstName, LastName, CNIC, PhoneNo, Address, City } = req.body;

        const newUser = {};
        if (FirstName) newUser.FirstName = FirstName;
        if (LastName) newUser.LastName = LastName;
        if (CNIC) newUser.CNIC = CNIC;
        if (PhoneNo) newUser.PhoneNo = PhoneNo;
        if (Address) newUser.Address = Address;
        if (City) newUser.City = City;

        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user = await User.findByIdAndUpdate(req.user.id, { $set: newUser }, { new: true });
        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.put("/ChangePassword", fetchuser, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        let user = await User.findById(req.user.id);

        if (!user) {
            return res.status(400).json({ error: "Account not found" });
        }

        const passwordCompare = await bcrypt.compare(oldPassword, user.Password);

        if (!passwordCompare) {
            return res.json({ success: false, message: "Invalid Old Password" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password in MongoDB
        user.Password = hashedNewPassword;
        await user.save();

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred');
    }
});

router.put("/forgetPassword", fetchuser, async (req, res) => {
    try {
        const { OTPReq, NewPassword } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(400).json({ error: "Account not found" });
        }

        const otpVerification = await OTP.findOne({ UserID: req.user.id });

        if (!otpVerification) {
            return res.json({
                success: false,
                message: "Request OTP Again"
            });
        }

        const { expireAt } = otpVerification;
        const hashedOTP = otpVerification.OTP;

        if (expireAt < new Date()) {
            await OTP.deleteMany({ UserID: req.user.id });
            return res.json({
                success: false,
                message: "Code has expired. Please request again"
            });
        }

        const validOTP = await bcrypt.compare(OTPReq, hashedOTP);

        if (!validOTP) {
            return res.json({
                success: false,
                message: "Invalid code passed. Check your inbox"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(NewPassword, salt);

        // Update the user's password in MongoDB
        user.Password = hashedNewPassword;
        await user.save();

        // Delete the OTP verification record
        await OTP.deleteMany({ UserID: req.user.id });

        res.json({
            success: true,
            message: "Password Updated successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred');
    }
});


//Reviews
router.post("/AddReview", fetchuser, async (req, res) => {
    try {
        const userid = req.user.id; // Assuming the beautician ID is extracted from the authenticated user
        const { Rating, Description, Beautician } = req.body;

        let user = await User.findById(userid);

        if (!user) {
            return res.status(401).send({ message: "Not Allowed" })
        }


        let review = await Review.create({
            Beautician: Beautician,
            User: userid,
            Rating: Rating,
            Description: Description
        });
        res.json({ success: true, message: "Review Added Successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
})




//Favriote
router.post("/AddFavriote", fetchuser, async (req, res) => {
    try {
        const userid = req.user.id; // Assuming the beautician ID is extracted from the authenticated user
        const { Beautician } = req.body;

        let user = await User.findById(userid);

        if (!user) {
            return res.status(401).send({ message: "Not Allowed" })
        }

        let favriote = await Favriote.findOne({ Beautician: Beautician, User: userid })

        if (favriote) {
            return res.json({ success: false, message: "Already Added to favriote" })
        }

        await Favriote.create({
            Beautician: Beautician,
            User: userid,
        });
        res.json({ success: true, message: "Added To Favriote" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
})

router.post("/RemoveFavriote", fetchuser, async (req, res) => {
    try {
        const userid = req.user.id; // Assuming the beautician ID is extracted from the authenticated user
        const { Beautician } = req.body;

        let user = await User.findById(userid);

        if (!user) {
            return res.status(401).send({ message: "Not Allowed" })
        }

        let favriote = await Favriote.findOne({ Beautician: Beautician, User: userid })

        if (favriote) {
            console.log(favriote._id)
            favriote = await Favriote.findByIdAndDelete(favriote._id)
            res.json({ success: true, message: "Removed To Favriote" });
        } else {
            return res.json({ success: false, message: "Not favriote" })
        }


    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
})

router.get("/GetFavrioteID", fetchuser, async (req, res) => {
    try {
        const userid = req.user.id; // Assuming the beautician ID is extracted from the authenticated user

        let user = await User.findById(userid);

        if (!user) {
            return res.status(401).send({ message: "Not Allowed" })
        }

        let favriote = await Favriote.find({ User: userid })

        if (favriote.length > 0) {
            res.json({ success: true, favriote });
        } else {
            return res.json({ success: false, message: "No favriote" })
        }


    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
})

router.get('/FavrioteBeautician', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Find beautician IDs in the user's favorites
        const favrioteBeauticianIds = await Favriote.find({ User: userId }).distinct('Beautician');

        // Fetch beautician data for the favorite beauticians
        const beauticiansData = await Beautician.find({ _id: { $in: favrioteBeauticianIds }, Status: "Approved" })
            .select('ProfiePhoto FirstName LastName address')
            .populate('Location');

        // Fetch total number of reviews and average rating for each beautician from Reviews schema
        const combinedData = await Promise.all(
            beauticiansData.map(async (beautician) => {
                const reviewsData = await Reviews.aggregate([
                    { $match: { Beautician: beautician._id } },
                    {
                        $group: {
                            _id: null,
                            totalRating: { $sum: { $toDouble: '$Rating' } },
                            totalReviews: { $sum: 1 }
                        }
                    }
                ]);

                const totalRating = reviewsData.length > 0 ? reviewsData[0].totalRating : 0;
                const totalReviews = reviewsData.length > 0 ? reviewsData[0].totalReviews : 0;
                const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

                return {
                    profilePhoto: beautician.ProfiePhoto,
                    firstName: beautician.FirstName,
                    lastName: beautician.LastName,
                    address: beautician.address,
                    totalReviews: totalReviews,
                    averageRating: averageRating.toFixed(2)
                };
            })
        );

        res.json({ success: true, data: combinedData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});



//Category
router.get("/Category", async (req, res) => {
    try {

        let category = await Category.find();


        res.json({ success: true, category });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/CtgBeautician/:categoryId", async (req, res) => {
    try {
        const categoryId = req.params.categoryId;

        // Find all services with the given category ID
        const services = await Service.find({ Category: categoryId });

        // Extract beautician IDs from the services
        const beauticianIds = services.map(service => service.Beautician);

        // Find beauticians using the extracted IDs
        const beauticiansData = await Promise.all(
            beauticianIds.map(async (beauticianId) => {
                const beautician = await Beautician.findOne({ _id: beauticianId, Status: "Approved", Is_Verfied: true });

                if (beautician) {
                    // Fetch total number of reviews and average rating for each beautician from Reviews schema
                    const reviewsData = await Reviews.aggregate([
                        { $match: { Beautician: beauticianId } },
                        {
                            $group: {
                                _id: null,
                                totalRating: { $sum: { $toDouble: '$Rating' } },
                                totalReviews: { $sum: 1 }
                            }
                        }
                    ]);

                    const totalRating = reviewsData.length > 0 ? reviewsData[0].totalRating : 0;
                    const totalReviews = reviewsData.length > 0 ? reviewsData[0].totalReviews : 0;
                    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

                    return {
                        profilePhoto: beautician?.ProfiePhoto,
                        firstName: beautician?.FirstName,
                        lastName: beautician?.LastName,
                        address: beautician?.address,
                        totalReviews: totalReviews,
                        averageRating: averageRating.toFixed(2)
                    };
                }
            })
        );

        if (beauticiansData[0] == null) {
            res.json({ success: true, data: [] });

        } else {
            res.json({ success: true, data: beauticiansData });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});


//Beautician On User Side
router.get("/TopRatedBeauticians", async (req, res) => {
    try {
        // Find all beauticians
        const beauticians = await Beautician.find({ Status: "Approved", Is_Verfied: true });

        // Sort beauticians based on average review rating (descending order)
        const sortedBeauticians = await Promise.all(
            beauticians.map(async (beautician) => {
                // Fetch total number of reviews and average rating for each beautician from Reviews schema
                const reviewsData = await Reviews.aggregate([
                    { $match: { Beautician: beautician._id } },
                    {
                        $group: {
                            _id: null,
                            totalRating: { $sum: { $toDouble: '$Rating' } },
                            totalReviews: { $sum: 1 }
                        }
                    }
                ]);

                const totalRating = reviewsData.length > 0 ? reviewsData[0].totalRating : 0;
                const totalReviews = reviewsData.length > 0 ? reviewsData[0].totalReviews : 0;
                const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

                return {
                    beauticianId: beautician._id,
                    profilePhoto: beautician.ProfiePhoto,
                    firstName: beautician.FirstName,
                    lastName: beautician.LastName,
                    address: beautician.address,
                    totalReviews: totalReviews,
                    averageRating: averageRating.toFixed(2)
                };
            })
        );

        // Sort the beauticians based on average rating in descending order
        const topRatedBeauticians = sortedBeauticians.sort((a, b) => b.averageRating - a.averageRating).slice(0, 5);

        res.json({ success: true, data: topRatedBeauticians });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/allBeauticians", async (req, res) => {
    try {
        // Set the page size (number of beauticians per page)
        const pageSize = 10;

        // Extract the page number from the request params
        const page = parseInt(req.query.page) || 1;

        // Find all beauticians
        const beauticians = await Beautician.find({ Status: "Approved", Is_Verfied: true });

        // Sort beauticians based on some criteria (modify as per your requirements)
        // In this example, sorting based on date (you can adjust this)
        beauticians.sort((a, b) => b.Date - a.Date);

        // Calculate the start and end indices based on the page number and page size
        const startIndex = (page - 1) * pageSize;
        const endIndex = page * pageSize;

        // Extract the beauticians for the requested page
        const paginatedBeauticians = beauticians.slice(startIndex, endIndex);

        // Transform the beautician data into the desired response format
        const beauticiansDetails = await Promise.all(
            paginatedBeauticians.map(async (beautician) => {
                // Fetch additional details or services for each beautician
                const reviews = await Reviews.find({ Beautician: beautician._id });

                // Calculate total reviews and average rating
                const totalReviews = reviews.length;
                const totalRating = reviews.reduce((sum, review) => sum + parseInt(review.Rating), 0);
                const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

                // Return the beautician details in the desired format
                return {
                    profilePhoto: beautician.ProfiePhoto,
                    firstName: beautician.FirstName,
                    lastName: beautician.LastName,
                    address: beautician.address,
                    totalReviews: totalReviews,
                    averageRating: averageRating.toFixed(2)
                };
            })
        );

        res.json({ success: true, data: beauticiansDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get('/nearbyBeauticians', async (req, res) => {
    try {
        const ip = req.ip || req.socket.remoteAddress;
        const geo = geoip.lookup(ip);

        if (!geo || !geo.ll) {
            return res.json({ success: false, message: 'Unable to determine coordinates.' });
        }

        const { latitude, longitude } = geo.ll;

        // Define a radius for nearby beauticians (adjust as needed)
        const radiusInKm = 10;

        // Find and limit to the top 5 nearby beauticians within the specified radius
        const nearbyBeauticians = await Beautician.find({
            Location: {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInKm / 6378.1] // Earth radius in km
                }
            }, Status: "Approved", Is_Verfied: true
        }).limit(5);

        // Fetch reviews for each nearby beautician
        const beauticiansData = await Promise.all(
            nearbyBeauticians.map(async (beautician) => {
                const reviewsData = await Reviews.aggregate([
                    { $match: { Beautician: beautician._id } },
                    {
                        $group: {
                            _id: null,
                            totalRating: { $sum: { $toDouble: '$Rating' } },
                            totalReviews: { $sum: 1 }
                        }
                    }
                ]);

                const totalRating = reviewsData.length > 0 ? reviewsData[0].totalRating : 0;
                const totalReviews = reviewsData.length > 0 ? reviewsData[0].totalReviews : 0;
                const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

                return {
                    profilePhoto: beautician.ProfiePhoto,
                    firstName: beautician.FirstName,
                    lastName: beautician.LastName,
                    address: beautician.address,
                    totalReviews: totalReviews,
                    averageRating: averageRating.toFixed(2)
                };
            })
        );

        res.json({ success: true, nearbyBeauticians: beauticiansData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get('/LocationBeautician', async (req, res) => {
    try {
        // Fetch data from Beautician schema
        const beauticiansData = await Beautician.find({ Status: "Approved", Is_Verfied: true }).select('Location ProfiePhoto');


        res.json({ success: true, data: beauticiansData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get('/BeauticianCards', async (req, res) => {
    try {
        // Fetch data from Beautician schema
        const beauticiansData = await Beautician.find({ Status: "Approved", Is_Verfied: true })
            .select('ProfiePhoto FirstName LastName address')
            .populate('Location');

        // Fetch total number of reviews and average rating for each beautician from Reviews schema
        const combinedData = await Promise.all(
            beauticiansData.map(async (beautician) => {
                const reviewsData = await Reviews.aggregate([
                    { $match: { Beautician: beautician._id } },
                    {
                        $group: {
                            _id: null,
                            totalRating: { $sum: { $toDouble: '$Rating' } },
                            totalReviews: { $sum: 1 }
                        }
                    }
                ]);

                console.log(beauticiansData)

                const totalRating = reviewsData.length > 0 ? reviewsData[0].totalRating : 0;
                const totalReviews = reviewsData.length > 0 ? reviewsData[0].totalReviews : 0;
                const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

                return {
                    profilePhoto: beautician.ProfiePhoto,
                    firstName: beautician.FirstName,
                    lastName: beautician.LastName,
                    address: beautician.address,
                    totalReviews: totalReviews,
                    averageRating: averageRating.toFixed(2)
                };
            })
        );

        res.json({ success: true, data: combinedData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/BeauticianDetail/:id", async (req, res) => {
    try {
        const id = req.params.id;


        let beautician = await Beautician.findById(id, { Is_Verfied: 0, Status: 0, Password: 0, CNIC_Front: 0, CNIC_Back: 0, CNIC: 0 })

        if (beautician) {
            res.json({ success: true, beautician });
        } else {
            return res.json({ success: false, message: "No Beautician Found" })
        }


    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
})

router.get("/BeauticianAbout/:id", async (req, res) => {
    try {
        const id = req.params.id;

        let about = await About.findOne({ Beautician: id })

        if (about) {
            res.json({ success: true, about });
        } else {
            return res.json({ success: false, message: "No About Found" })
        }


    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
})

router.get("/BeauticianService/:id", async (req, res) => {
    try {
        const beauticianId = req.params.id;

        // Fetch service data for the given Beautician ID
        const services = await Service.find({ Beautician: beauticianId });

        if (services.length > 0) {
            // Extract category names for each service record
            const servicesData = await Promise.all(
                services.map(async (service) => {
                    // Fetch category details for each category ID in the service
                    const category = await Category.findById(service.Category);

                    // Extract category name from the fetched category
                    const categoryName = category ? category.Name : null;

                    // Include category names in the service record
                    return {
                        ...service.toObject(),
                        categoryName
                    };
                })
            );

            res.json({ success: true, services: servicesData });
        } else {
            return res.json({ success: false, message: "No Service Found for the Beautician" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/BeauticianReviews/:id", async (req, res) => {
    try {
        const beauticianId = req.params.id;

        // Fetch service data for the given Beautician ID
        const reviews = await Review.find({ Beautician: beauticianId });

        if (reviews.length > 0) {
            // Extract category names for each service record
            const reviewData = await Promise.all(
                reviews.map(async (review) => {
                    // Fetch category details for each category ID in the service
                    const user = await User.findById(review.User);

                    // Extract category name from the fetched category
                    const UserFirstName = user ? user.FirstName : null;
                    const UserLastName = user ? user.LastName : null;

                    // Include category names in the service record
                    return {
                        ...review.toObject(),
                        UserFirstName,
                        UserLastName
                    };
                })
            );

            res.json({ success: true, Reviews: reviewData });
        } else {
            return res.json({ success: false, message: "No Service Found for the Beautician" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});





//Promotions
router.get("/Promotions", async (req, res) => {
    try {
        // Calculate the date two days back from the current date
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);


        // Find promotions with an expiry date two days back or earlier
        let promotions = await Promotion.find({ ExpireDate: { $lte: twoDaysAgo }, status: "Active" }).select("Heading PercentageOff");

        res.json({ success: true, promotions });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/DetailPromotions/:id", async (req, res) => {
    try {
        const id = req.params.id
        let promotions = await Promotion.findById(id);

        if (!promotions) {
            return res.json({ success: false, message: "No Promotion Fin with this ID" })
        }

        res.json({ success: true, promotions });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.post("/applyPromotion", fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { promoCode, orderPrice } = req.body;

        // Assuming you have a User model
        const user = await User.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User Not Found" });
        }

        const promotion = await Promotion.findOne({ PromoCode: promoCode });

        if (!promotion) {
            return res.json({ success: false, message: "Invalid promotion code" });
        }

        if (promotion.status !== 'Active') {
            return res.json({ success: false, message: "Promotion is Inactive" });
        }

        // Check if the promotion is expired
        const currentDate = new Date();
        if (promotion.ExpireDate && currentDate < promotion.ExpireDate) {
            return res.json({ success: false, message: "Promotion has expired" });
        }

        // Check if the user has already used this promotion
        const usedPromotion = user.usedPromotions.find((promo) => promo.promoCode === promoCode);

        // Define the usage limit for the promotion
        const usageLimit = promotion.UsageLimit?.UsageLimit; // Adjust as needed

        if (promotion.UsageLimit.isLimit && usedPromotion && usedPromotion.usageCount >= usageLimit) {
            return res.json({ success: false, message: "Promotion usage limit exceeded" });
        }

        // Check shopping limit
        if (promotion.ShoppingLimit.isLimit && orderPrice < parseFloat(promotion.ShoppingLimit.AmountLimit)) {
            return res.json({ success: false, message: `Shopping limit of ${parseFloat(promotion.ShoppingLimit.AmountLimit)} on this Promotion` });
        }

        // Apply the promotion (replace this with your actual logic)
        const discountPercentage = parseFloat(promotion.PercentageOff);
        const discountAmount = (orderPrice * discountPercentage) / 100;
        const discountedTotal = orderPrice - discountAmount;

        // Update or add the used promotion to the user's record
        if (promotion.UsageLimit.isLimit) {
            if (usedPromotion) {
                usedPromotion.usageCount += 1;
            } else {
                user.usedPromotions.push({ PromoID: promotion._id, promoCode, usageCount: 1 });
            }

        }

        await user.save();

        // Return additional information in the response
        res.json({
            success: true,
            message: "Promotion applied successfully",
            discountPercentage: promotion.PercentageOff,
            promoId: promotion._id,
            discountedTotal: discountedTotal.toFixed(2)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error occurred" });
    }
});




module.exports = router