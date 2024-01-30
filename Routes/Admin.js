const express = require("express");
require("dotenv").config();


const Admin = require("../Models/Admin")
const Category = require("../Models/Category")
const Promotion = require("../Models/Promotions")
const User = require("../Models/User")
const Beautician = require("../Models/Beautician");
const About = require("../Models/BeauticianAbout");
const Service = require("../Models/Services");
const Reviews = require("../Models/Review");
const Booking = require("../Models/Booking");
const Payment = require("../Models/Payment");

const router = express.Router();
const fetchadmin = require('../midelware/FetchAdmin')
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const multer = require('multer');


const upload = multer({ storage: multer.memoryStorage() });

const JWT_KEY = process.env.JWT_KEY;

//Create a admin 
router.post("/createAdmin", async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
    }

    try {

        let admin = await Admin.findOne({ Email: req.body.Email })
        if (admin) {
            return res.status(404).json({ success, error: "this account already exist" })
        }

        admin = await Admin.findOne({ Username: req.body.Username })
        if (admin) {
            return res.status(404).json({ success, error: "this User Name already exist" })
        }


        const Salt = await bcrypt.genSalt(10);
        const SecPassword = await bcrypt.hash(req.body.Password, Salt)
        admin = await Admin.create({
            Email: req.body.Email,
            Username: req.body.Username,
            Name: req.body.Name,
            Password: SecPassword,
        })

        const data = {
            admin: {
                id: admin.id,
            }
        }

        const AdminODSToken = jwt.sign(data, JWT_KEY);

        success = true;
        res.json({ success, AdminODSToken })

    } catch (error) {
        console.error(error)
        res.status(500).send('error occured')
    }
})

//Login a admin
router.post("/loginAdmin", async (req, res) => {
    let success = false;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { Username, Password } = req.body;

    try {
        let admin = await Admin.findOne({ Username })
        if (!admin) {
            return res.status(400).json({ success: false, Message: "Account does not Exist" })
        }

        const passwordCompare = await bcrypt.compare(Password, admin.Password)

        if (!passwordCompare) {
            return res.status(400).json({ success: false, Message: "UserName or Password is Incorrect" })
        }

        const Payload = {
            admin: {
                id: admin.id,
            }
        }
        const AdminODSToken = jwt.sign(Payload, JWT_KEY);
        success = true;
        res.json({ success, AdminODSToken })

    } catch (error) {
        console.error(error)
        res.status(500).send({ success: false, Message: 'Error occured' })
    }
})

//Category
router.get("/Category", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let category = await Category.find();


        res.json({ success: true, category });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.post("/AddCategory", upload.single('Logo'), fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let category = await Category.findOne({ Name: req.body.Name });

        const imageBuffer = req.file.buffer;
        const Logo = imageBuffer.toString('base64');

        // If the document exists, update it; otherwise, create a new one
        if (category) {
            return res.json({ Success: "false", message: "This Name Category Already Exist" })
        } else {
            category = new Category({
                Name: req.body.Name,
                Logo: Logo
            });
            await category.save();
        }


        res.json({ success: true, message: "Category Added Successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.put("/UpdateCategory/:id", fetchadmin, upload.fields([
    { name: 'Logo', maxCount: 1 }
]), async (req, res) => {
    try {
        const { Name } = req.body;
        const { id } = req.params;
        const adminID = req.admin.id;

        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to Update Data" })
        }

        const newCategory = {};
        if (Name) newCategory.Name = Name;

        // Check if files are uploaded and convert them to base64
        if (req.files) {
            if (req.files['Logo']) {
                console.log(req.files)
                const imageBuffer = req.files['Logo'][0].buffer;
                newCategory.Logo = imageBuffer.toString('base64');
            }
        }

        console.log(req.body)

        let category = await Category.findByIdAndUpdate(id, { $set: newCategory }, { new: true });
        if (!category) {
            return res.json({ success: false, message: "Category not found" });
        }

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.delete("/DeleteCategory/:id", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user
        const { id } = req.params;

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let category = await Category.findByIdAndDelete(id);


        // If the document exists, update it; otherwise, create a new one
        console.log(category)
        if (category) {
            res.json({ success: true, message: "Category deleted successfully" });
        } else {
            res.status(404).json({ success: false, message: "Category not found for deletion" });
        }


    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});


//Promotions
router.get("/Promotions", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let promotion = await Promotion.find();


        res.json({ success: true, promotion });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.post("/CreatePromotion", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id;

        // Check if the admin exists
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ success: false, message: "You are not allowed to add data" });
        }

        // Check if the promotion with the specified PromoCode already exists
        let promotion = await Promotion.findOne({ PromoCode: req.body.PromoCode });

        if (promotion) {
            return res.json({ success: false, message: "This Code is already assigned to a promotion" });
        }

        console.log(req.body.Heading)

        // Create a new promotion
        promotion = new Promotion({
            Heading: req.body.Heading,
            PercentageOff: req.body.PercentageOff,
            Intro: req.body.Intro,
            Description: req.body.Description,
            PromoCode: req.body.PromoCode,
            ShoppingLimit: {
                isLimit: req.body.ShoppingLimit.isLimit,
                AmountLimit: req.body.ShoppingLimit.isLimit ? req.body.ShoppingLimit.AmountLimit : undefined
            },
            UsageLimit: {
                isLimit: req.body.UsageLimit.isLimit,
                UsageLimit: req.body.UsageLimit.isLimit ? req.body.UsageLimit.UsageLimit : undefined
            },
            ExpireDate: req.body.ExpireDate,
            status: "Active"
        });

        await promotion.save();

        res.json({ success: true, message: "Promotion added successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.put("/UpdatePromotion/:id", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id;
        const promotionID = req.params.id;

        // Check if the admin exists
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ success: false, message: "You are not allowed to update data" });
        }

        // Check if the promotion with the specified ID exists
        let promotion = await Promotion.findById(promotionID);

        if (!promotion) {
            return res.status(404).json({ success: false, message: "Promotion not found" });
        }

        // Update specific fields based on the request body
        if (req.body.Heading) promotion.Heading = req.body.Heading;
        if (req.body.PercentageOff) promotion.PercentageOff = req.body.PercentageOff;
        if (req.body.Intro) promotion.Intro = req.body.Intro;
        if (req.body.Description) promotion.Description = req.body.Description;
        if (req.body.PromoCode) promotion.PromoCode = req.body.PromoCode;
        if (req.body.ShoppingLimit) {
            promotion.ShoppingLimit.isLimit = req.body.ShoppingLimit.isLimit;
            promotion.ShoppingLimit.AmountLimit = req.body.ShoppingLimit.AmountLimit;
        }
        if (req.body.UsageLimit) {
            promotion.UsageLimit.isLimit = req.body.UsageLimit.isLimit;
            promotion.UsageLimit.UsageLimit = req.body.UsageLimit.UsageLimit;
        }
        if (req.body.ExpireDate) promotion.ExpireDate = req.body.ExpireDate;

        // Save the updated promotion
        await promotion.save();

        res.json({ success: true, message: "Promotion updated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.delete("/DeletePromotion/:id", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user
        const { id } = req.params;

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let promotion = await Promotion.findById(id);

        if (!promotion) {
            res.status(404).json({ success: false, message: "Promotion not found for deletion" });
            return;
        }

        promotion.status = 'DeActivate';

        promotion.save();
        res.json({ success: true, message: "Promotion DecActivated successfully" });


    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.delete("/clearPromotionUsage/:promoId", async (req, res) => {
    try {
        const promoId = req.params.promoId;

        // Find users who have used the specified promotion
        const usersWithPromotion = await User.find({ "usedPromotions.PromoID": promoId });

        console.log(usersWithPromotion)
        // Clear usage data for the specified promotion in each user
        usersWithPromotion.forEach(async (user) => {
            user.usedPromotions = user.usedPromotions.filter((promo) => promo.PromoID.toString() !== promoId);
            await user.save();
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error occurred" });
    }
});






//User
router.get("/users", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let user = await User.find({}, { Password: 0 });


        res.json({ success: true, user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/UserDetail/:id", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user
        const { id } = req.params

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let user = await User.findById(id,{Password:0,usedPromotions:0});

        if (!user) {
            res.json({ success: false, message: "No User Find" })
        }
        let Bookings = await Booking.find({ User: id });
        let Review = await Reviews.find({ User: id });



        res.json({ success: true, user, Bookings,Review });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get('/userStatistics', fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id;

        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allowed to add Data" })
        }

        // Fetch total number of users
        const totalUsers = await User.countDocuments();

        // Calculate the start and end dates for the current and last month
        const currentMonthStart = moment().startOf('month').toDate();
        const currentMonthEnd = moment().endOf('month').toDate();
        const lastMonthStart = moment().subtract(1, 'months').startOf('month').toDate();
        const lastMonthEnd = moment().subtract(1, 'months').endOf('month').toDate();

        // Fetch number of users registered this month
        const usersThisMonth = await User.countDocuments({
            Date: { $gte: currentMonthStart, $lte: currentMonthEnd }
        });

        // Fetch number of users registered last month
        const usersLastMonth = await User.countDocuments({
            Date: { $gte: lastMonthStart, $lte: lastMonthEnd }
        });

        // Calculate the percentage of users for this month and last month
        const percentageThisMonth = (usersThisMonth / totalUsers) * 100;
        const percentageLastMonth = (usersLastMonth / totalUsers) * 100;

        // Calculate the percentage increase or decrease
        const percentageChange = percentageThisMonth - percentageLastMonth;

        // Fetch number of users registered in the last six months
        const sixMonthsAgo = moment().subtract(6, 'months').toDate();
        const usersLastSixMonths = await User.aggregate([
            {
                $match: {
                    Date: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$Date' },
                        year: { $year: '$Date' }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Fill in the array with month, year, and the number of registrations
        const userRegistrationArray = Array.from({ length: 6 }, (_, i) => {
            const monthYear = moment().subtract(i, 'months');
            const monthData = usersLastSixMonths.find(data =>
                data._id.month === monthYear.month() + 1 && data._id.year === monthYear.year()
            );
            return {
                month: monthYear.format('MMMM'),
                year: monthYear.year(),
                count: monthData ? monthData.count : 0
            };
        });

        res.json({
            success: true,
            totalUsers,
            percentageChange,
            userRegistrationArray
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});




//Beatuician
router.get("/beautician", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let beautician = await Beautician.find({}, { Password: 0 });


        res.json({ success: true, beautician });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/Blockedbeautician", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let beautician = await Beautician.find({ Status: "Blocked" }, { Password: 0 });


        res.json({ success: true, beautician });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/Newbeautician", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let beautician = await Beautician.find({ Status: "Pending" }, { Password: 0 });


        res.json({ success: true, beautician });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/Deniedbeautician", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let beautician = await Beautician.find({ Status: "Denied" }, { Password: 0 });


        res.json({ success: true, beautician });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/Approvedbeautician", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data" })
        }

        let beautician = await Beautician.find({ Status: "Approved" }, { Password: 0 });


        res.json({ success: true, beautician });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get("/BeauticianDetail/:id", fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id;
        const { id } = req.params;

        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allowed to add Data" });
        }

        let beautician = await Beautician.findById(id, { Password: 0 });

        if (!beautician) {
            res.json({ success: false, message: "No Beautician Found" });
        }

        let Abouts = await About.findOne({ Beautician: id });
        let Services = await Service.find({ Beautician: id }).populate('Category', 'Name Logo');
        let Review = await Reviews.find({ Beautician: id });
        let Bookings = await Booking.find({ Beautician: id });

        // Process the populated Category data
        Services = Services.map(service => {
            return {
                ...service.toObject(),
                Category: {
                    Name: service.Category.Name,
                    Logo: service.Category.Logo
                }
            };
        });

        res.json({ success: true, beautician, Services, Abouts, Review, Bookings });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.get('/beauticianStatistics', fetchadmin, async (req, res) => {
    try {
        const adminID = req.admin.id;

        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allowed to add Data" })
        }

        // Fetch total number of users
        const totalbeautician = await Beautician.countDocuments();

        // Calculate the start and end dates for the current and last month
        const currentMonthStart = moment().startOf('month').toDate();
        const currentMonthEnd = moment().endOf('month').toDate();
        const lastMonthStart = moment().subtract(1, 'months').startOf('month').toDate();
        const lastMonthEnd = moment().subtract(1, 'months').endOf('month').toDate();

        // Fetch number of users registered this month
        const beauticianThisMonth = await Beautician.countDocuments({
            Date: { $gte: currentMonthStart, $lte: currentMonthEnd }
        });

        // Fetch number of users registered last month
        const beauticianLastMonth = await Beautician.countDocuments({
            Date: { $gte: lastMonthStart, $lte: lastMonthEnd }
        });

        // Calculate the percentage of users for this month and last month
        const percentageThisMonth = (beauticianThisMonth / totalbeautician) * 100;
        const percentageLastMonth = (beauticianLastMonth / totalbeautician) * 100;

        // Calculate the percentage increase or decrease
        const percentageChange = percentageThisMonth - percentageLastMonth;

        // Fetch number of users registered in the last six months
        const sixMonthsAgo = moment().subtract(6, 'months').toDate();
        const beauticianLastSixMonths = await Beautician.aggregate([
            {
                $match: {
                    Date: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$Date' },
                        year: { $year: '$Date' }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Fill in the array with month, year, and the number of registrations
        const beauticianRegistrationArray = Array.from({ length: 6 }, (_, i) => {
            const monthYear = moment().subtract(i, 'months');
            const monthData = beauticianLastSixMonths.find(data =>
                data._id.month === monthYear.month() + 1 && data._id.year === monthYear.year()
            );
            return {
                month: monthYear.format('MMMM'),
                year: monthYear.year(),
                count: monthData ? monthData.count : 0
            };
        });

        res.json({
            success: true,
            totalbeautician,
            percentageChange,
            beauticianRegistrationArray
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});





//Update Beautician Status
router.put("/StatusApprove/:id", fetchadmin, async (req, res) => {
    try {
        const id = req.params.id;
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data, Login Again" });
        }

        let beautician = await Beautician.findByIdAndUpdate(id, { Status: "Approved" });
        if (!beautician) {
            return res.status(400).json({ message: "No Beautician Exist" });
        }


        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.put("/StatusBlock/:id", fetchadmin, async (req, res) => {
    try {
        const id = req.params.id;
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data, Login Again" });
        }

        let beautician = await Beautician.findByIdAndUpdate(id, { Status: "Blocked" });
        if (!beautician) {
            return res.status(400).json({ message: "No Beautician Exist" });
        }


        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.put("/StatusDenied/:id", fetchadmin, async (req, res) => {
    try {
        const id = req.params.id;
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data, Login Again" });
        }

        let beautician = await Beautician.findByIdAndUpdate(id, { Status: "Denied" });
        if (!beautician) {
            return res.status(400).json({ message: "No Beautician Exist" });
        }


        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});

router.delete("/Delete/:id", fetchadmin, async (req, res) => {
    try {
        const id = req.params.id;
        const adminID = req.admin.id; // Assuming the beautician ID is extracted from the authenticated user

        // Check if the BeauticianAbout document already exists for the beautician
        let admin = await Admin.findById(adminID);
        if (!admin) {
            return res.status(404).json({ message: "You are not allow to add Data, Login Again" });
        }

        let beautician = await Beautician.findByIdAndDelete(id);
        if (!beautician) {
            return res.status(400).json({ message: "No Beautician Exist" });
        }


        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error occurred' });
    }
});


module.exports = router