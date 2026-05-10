const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const flash = require("connect-flash")
require("dotenv").config()

const app = express()

// --------------------
// Middleware
// --------------------
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public"))

// EJS setup
app.set("view engine", "ejs")

// --------------------
// MongoDB Connection
// --------------------
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err))

// --------------------
// Session Setup
// --------------------
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        mongoUrl: process.env.MONGO_URL
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}))

// --------------------
// Flash Middleware (IMPORTANT)
// --------------------
app.use(flash())

// Make flash + user available in all EJS pages
app.use((req, res, next) => {
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error")
    res.locals.user = req.session.user
    next()
})

// --------------------
// Routes
// --------------------

// Home Route
app.get("/", (req, res) => {
    res.render("home")
})

// Auth Routes
const authRoutes = require("./routes/authRoutes")
app.use("/", authRoutes)

// Account Routes
const accountRoutes = require("./routes/accountRoutes")
app.use("/", accountRoutes)

// --------------------
// Models
// --------------------
const Transaction = require("./models/Transaction")

// Middleware
const { isLoggedIn } = require("./middleware/auth")

// --------------------
// Dashboard Route (Protected)
// --------------------
app.get("/dashboard", isLoggedIn, async (req, res) => {

    const transactions = await Transaction.find({
        userId: req.session.user._id
    }).sort({ date: -1 })

    let credit = 0;
    let debit = 0;

    transactions.forEach(txn => {
        if (txn.type === "CREDIT") credit += txn.amount;
        if (txn.type === "DEBIT") debit += txn.amount;
    });

    res.render("dashboard", {
        user: req.session.user,
        transactions,
        credit,
        debit
    });
});

// --------------------
// Start Server
// --------------------
app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})