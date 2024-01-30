const express = require("express");
const Beautician = require("../Models/Beautician");
const OTP = require("../Models/BeauticianOTP");
const About = require("../Models/BeauticianAbout");
const Service = require("../Models/Services");
const router = express.Router();
const fetchbeautician = require('../midelware/FetchBeautician')
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer')
const multer = require('multer');

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

        await OTP.deleteMany({ BeauticianID: id });

        await OTP.create({
            BeauticianID: id,
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

//Create a user 
router.post("/createbeautician", async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
    }

    try {

        let beautician = await Beautician.findOne({ Email: req.body.Email })
        if (beautician) {
            return res.status(404).json({ success, error: "This Email already exist" })
        }

        beautician = await Beautician.findOne({ Username: req.body.Username })
        if (beautician) {
            return res.status(404).json({ success, error: "This UserName already exist" })
        }


        const Salt = await bcrypt.genSalt(10);
        const SecPassword = await bcrypt.hash(req.body.Password, Salt)
        beautician = await Beautician.create({
            FirstName: req.body.FirstName,
            LastName: req.body.LastName,
            Email: req.body.Email,
            Username: req.body.Username,
            PhoneNo: req.body.Phone,
            Password: SecPassword,
            Status: "Pending"
        })

        const response = await sendOTPEmail(beautician.id, req.body.Email, res);

        const data = {
            beautician: {
                id: beautician.id,
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
        let { beauticianCRSFToken, otp } = req.body;
        const password = jwt.verify(beauticianCRSFToken, JWT_KEY);
        const beauticianID = password.beautician.id;
        if (!beauticianID || !otp) {
            res.json({
                status: "Failed",
                message: "Empty otp details are not allowed"
            });
        } else {
            const otpVerification = await OTP.findOne({ BeauticianID: beauticianID });

            if (!otpVerification) {
                res.json({
                    success: false,
                    message: "Account record doesn't exist"
                });
            } else {
                const { expireAt } = otpVerification;
                const hashedOTP = otpVerification.OTP;

                if (expireAt < new Date()) {
                    await OTP.deleteMany({ BeauticianID: beauticianID });
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
                        await Beautician.updateOne({ _id: beauticianID }, { Is_Verfied: true });
                        await OTP.deleteMany({ BeauticianID: beauticianID });

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
        const { beauticianCRSFToken } = req.body;
        const password = jwt.verify(beauticianCRSFToken, JWT_KEY);
        const beauticianID = password.beautician.id;

        // Delete existing OTP verification document
        await OTP.deleteMany({ BeauticianID: beauticianID });

        // Fetch user data by userID
        const beautician = await Beautician.findOne({ _id: beauticianID });

        if (!beautician) {
            res.json({
                success: false,
                message: "Beautician not found"
            });
            return;
        }

        const email = beautician.Email;

        // Send new OTP email
        await sendOTPEmail(beauticianID, email);

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
router.post("/loginbeautician", async (req, res) => {
    let success = false;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { Username, Password } = req.body;

    try {
        let beautician = await Beautician.findOne({ Username: Username })
        if (!beautician) {
            return res.status(400).json({ Message: "Account doesn't Fine" })
        }

        const passwordCompare = await bcrypt.compare(Password, beautician.Password)

        if (!passwordCompare) {
            return res.status(400).json({ Message: "UserName or Password Does not Find" })
        }

        const Payload = {
            beautician: {
                id: beautician.id,
            }
        }
        const AuthToken = jwt.sign(Payload, JWT_KEY);
        success = true;
        if (!beautician.Is_Verfied) {
            await sendOTPEmail(beautician._id, beautician.Email);
            return res.json({ success: true, Email: false, Message: "Email Verification Required", AuthToken });
        }

        res.json({ success, AuthToken })

    } catch (error) {
        console.error(error)
        res.status(500).send('error occured')
    }
})

//Update API for Beautician Data
router.put("/UpdateBeautician", fetchbeautician, upload.fields([
    { name: 'ProfiePhoto', maxCount: 1 },
    { name: 'CNIC_Front', maxCount: 1 },
    { name: 'CNIC_Back', maxCount: 1 }
]), async (req, res) => {
    try {
        const { FirstName, LastName, CNIC, PhoneNo, Gender, Location } = req.body;

        let beautician = await Beautician.findById(req.beautician.id);

        if (!beautician) {
            return res.status(400).json({ error: "Account not found" });
        }

        const newBeautician = {};
        if (FirstName) newBeautician.FirstName = FirstName;
        if (LastName) newBeautician.LastName = LastName;
        if (CNIC) newBeautician.CNIC = CNIC;
        if (PhoneNo) newBeautician.PhoneNo = PhoneNo;
        if (Gender) newBeautician.Gender = Gender;
        if (Location) newBeautician.Location = Location;

        // Check if files are uploaded and convert them to base64
        if (req.files) {
            if (req.files['ProfiePhoto']) {
                const imageBuffer = req.files['ProfiePhoto'][0].buffer;
                newBeautician.ProfiePhoto = imageBuffer.toString('base64');
            }
            if (req.files['CNIC_Front']) {
                const imageBuffer = req.files['CNIC_Front'][0].buffer;
                newBeautician.CNIC_Front = imageBuffer.toString('base64');
            }
            if (req.files['CNIC_Back']) {
                const imageBuffer = req.files['CNIC_Back'][0].buffer;
                newBeautician.CNIC_Back = imageBuffer.toString('base64');
            }
        }

        beautician = await Beautician.findByIdAndUpdate(req.beautician.id, { $set: newBeautician }, { new: true });
        if (!beautician) {
            return res.status(404).json({ success: false, message: "Beautician not found" });
        }

        res.json({ success: true });

    } catch (error) {
        console.error(error);

        // Remove uploaded files in case of an error
        if (req.files) {
            Object.values(req.files).forEach(async (fileArray) => {
                await Promise.all(fileArray.map(async (file) => {
                    await fs.unlink(file.path);
                }));
            });
        }

        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

//Change Password API of beautician
router.put("/ChangePassword", fetchbeautician, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        let beautician = await Beautician.findById(req.beautician.id);

        if (!beautician) {
            return res.status(400).json({ error: "Account not found" });
        }

        const passwordCompare = await bcrypt.compare(oldPassword, beautician.Password);

        if (!passwordCompare) {
            return res.json({ success: false, message: "Invalid Old Password" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password in MongoDB
        beautician.Password = hashedNewPassword;
        await beautician.save();

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred');
    }
});

//Forget Password API of beautician
router.put("/forgetPassword", fetchbeautician, async (req, res) => {
    try {
        const { OTPReq, NewPassword } = req.body;

        const beautician = await Beautician.findById(req.beautician.id);

        if (!beautician) {
            return res.status(400).json({ error: "Account not found" });
        }

        const otpVerification = await OTP.findOne({ BeauticianID: req.beautician.id });

        if (!otpVerification) {
            return res.json({
                success: false,
                message: "Request OTP Again"
            });
        }

        const { expireAt } = otpVerification;
        const hashedOTP = otpVerification.OTP;

        if (expireAt < new Date()) {
            await OTP.deleteMany({ BeauticianID: req.beautician.id });
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
        beautician.Password = hashedNewPassword;
        await beautician.save();

        // Delete the OTP verification record
        await OTP.deleteMany({ BeauticianID: req.beautician.id });

        res.json({
            success: true,
            message: "Password Updated successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred');
    }
});

//Adding About Data for Beautician
router.post("/Addabout", fetchbeautician, async (req, res) => {
    try {
        const beauticianId = req.beautician.id; // Assuming the beautician ID is extracted from the authenticated user
        const { AboutData, Timings, Contact } = req.body;

        let beautician = await Beautician.findById( beauticianId );

        if (!beautician) {
            return res.status(401).send({ message: "Not Allowed" })
        }

        // Check if the BeauticianAbout document already exists for the beautician
        let about = await About.findOne({ Beautician: beauticianId });

        // If the document exists, update it; otherwise, create a new one
        if (about) {
            about.AboutData = AboutData;
            about.Timings = Timings;
            about.Contact = Contact;
            await about.save();
        } else {
            about = new About({
                Beautician: beauticianId,
                AboutData: AboutData,
                Timings: Timings,
                Contact: Contact
            });
            await about.save();
        }


        res.json({ success: true, message: "Beautician About data saved successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

//Update About Data
router.put("/Updateabout", fetchbeautician, async (req, res) => {
    try {
        const beauticianId = req.beautician.id; // Assuming the beautician ID is extracted from the authenticated user
        const { AboutData: newAbout, Timings: newTimings, Contact: newContact } = req.body;

        let beautician = await Beautician.findById( beauticianId );

        if (!beautician) {
            return res.status(401).send({ message: "Not Allowed" })
        }


        // Find the BeauticianAbout document for the specified beautician
        let about = await About.findOne({ Beautician: beauticianId });

        if (!about) {
            return res.status(404).json({ success: false, message: "Beautician About data not found" });
        }

        // Update the fields if provided in the request body
        if (newAbout) about.AboutData = newAbout;
        if (newTimings) about.Timings = newTimings;
        if (newContact) about.Contact = newContact;

        await about.save();

        res.json({ success: true, message: "Beautician About data updated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

//Add Services
router.post("/Addservice", fetchbeautician, async (req, res) => {
    try {
        const beauticianId = req.beautician.id; // Assuming the beautician ID is extracted from the authenticated user
        const { Category, Types } = req.body;

        let beautician = await Beautician.findById( beauticianId );

        if (!beautician) {
            return res.status(401).send({ message: "Not Allowed" })
        }

        // Check if the BeauticianAbout document already exists for the beautician
        let service = await Service.findOne({ Beautician: beauticianId, Category: Category });

        if(service){

            service.Types.push(...Types);
            service.save();
            res.json({ success: true, message: "Service Updated Succesfully" });

        }else{
            service = new Service({
                Beautician: beauticianId,
                Category: Category,
                Types: Types
            });
            await service.save();
            res.json({ success: true, message: "Service Added Succesfully" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

//Delete Category
router.delete("/deleteCategory/:categoryId", fetchbeautician, async (req, res) => {
    try {
        const beauticianId = req.beautician.id;
        const categoryId = req.params.categoryId;

        let beautician = await Beautician.findById( beauticianId );

        if (!beautician) {
            return res.status(401).send({ message: "Not Allowed" })
        }

        // Find and delete the service entry for the specified category and beautician
        const result = await Service.deleteOne({ Beautician: beauticianId, Category: categoryId });

        if (result) {
            res.json({ success: true, message: "Category deleted successfully" });
        } else {
            res.status(404).json({ success: false, message: "Category not found for deletion" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

//Delete Type of Any Category
router.delete("/deleteType/:categoryId/:typeId", fetchbeautician, async (req, res) => {
    try {
        const beauticianId = req.beautician.id;
        const categoryId = req.params.categoryId;
        const typeId = req.params.typeId;

        let beautician = await Beautician.findById( beauticianId );

        if (!beautician) {
            return res.status(401).send({ message: "Not Allowed" })
        }


        // Find the service entry for the specified category and beautician
        const service = await Service.findOne({ Beautician: beauticianId, Category: categoryId });

        if (!service) {
            return res.status(404).json({ success: false, message: "Service entry not found" });
        }

        // Remove the specified type from the Types array
        service.Types = service.Types.filter(type => type._id.toString() !== typeId);
        await service.save();

        res.json({ success: true, message: "Service deleted successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});







module.exports = router