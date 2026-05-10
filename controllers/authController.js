const User = require("../models/User")
const bcrypt = require("bcryptjs")

// Show Register Page
exports.getRegister = (req, res) => {
    res.render("register")
}

// Register User
exports.postRegister = async (req, res) => {
    try {
        const { name, email, password } = req.body

        // Check if email already exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            req.flash("error", "❌ Email already registered. Please login.")
            return res.redirect("/register")
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await User.create({
            name,
            email,
            password: hashedPassword
        })

        req.flash("success", "✅ Registration successful! Please login.")
        res.redirect("/login")
    } catch (err) {
        console.log(err)
        req.flash("error", "❌ Something went wrong. Please try again.")
        res.redirect("/register")
    }
}

// Show Login Page
exports.getLogin = (req, res) => {
    res.render("login")
}

// Login User
exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email })

        if (!user) {
            req.flash("error", "❌ User not found. Please register first.")
            return res.redirect("/login")
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            req.flash("error", "❌ Invalid password. Please try again.")
            return res.redirect("/login")
        }

        // Save user in session
        req.session.user = user

        res.redirect("/dashboard")
    } catch (err) {
        console.log(err)
        req.flash("error", "❌ Something went wrong. Please try again.")
        res.redirect("/login")
    }
}

// Logout
exports.logout = (req, res) => {
    req.session.destroy()
    res.redirect("/login")
}