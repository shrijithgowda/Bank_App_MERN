const express = require("express")
const router = express.Router()

const User = require("../models/User")
const Transaction = require("../models/Transaction")
const PDFDocument = require("pdfkit");
const { isLoggedIn } = require("../middleware/auth")

// --------------------
// WITHDRAW PAGE
// --------------------
router.get("/withdraw", isLoggedIn, (req, res) => {
    res.render("withdraw")
})

// --------------------
// WITHDRAW LOGIC
// --------------------
router.post("/withdraw", isLoggedIn, async (req, res) => {
    const amount = Number(req.body.amount)

    const user = await User.findById(req.session.user._id)

    if (user.balance < amount) {
       req.flash("error", "❌ Insufficient Balance")
return res.redirect("/withdraw")
    }

    user.balance -= amount
    await user.save()

    // ✅ Save transaction
    await Transaction.create({
        userId: user._id,
        type: "DEBIT",
        amount,
        balanceAfter: user.balance
    })

    req.session.user = user

    req.flash("success", "💸 Withdrawal successful!")
res.redirect("/dashboard")
})


// --------------------
// DEPOSIT PAGE
// --------------------
router.get("/deposit", isLoggedIn, (req, res) => {
    res.render("deposit")
})

// --------------------
// DEPOSIT LOGIC
// --------------------
router.post("/deposit", isLoggedIn, async (req, res) => {
    const amount = Number(req.body.amount)

    const user = await User.findById(req.session.user._id)

    user.balance += amount
    await user.save()

    // ✅ Save transaction
    await Transaction.create({
        userId: user._id,
        type: "CREDIT",
        amount,
        balanceAfter: user.balance
    })

    req.session.user = user

  req.flash("success", "💸 Deposit successful!")
res.redirect("/dashboard")
})



router.get("/transfer", isLoggedIn, (req, res) => {
    res.render("transfer")
})

router.post("/transfer", isLoggedIn, async (req, res) => {

    const { email, amount } = req.body
    const transferAmount = Number(amount)

    const sender = await User.findById(req.session.user._id)
    const receiver = await User.findOne({ email })

    // ❌ Receiver not found
    if (!receiver) {
        req.flash("error", "❌ Receiver not found")
        return res.redirect("/transfer")
    }

    // ❌ Self transfer check
    if (sender.email === email) {
        req.flash("error", "❌ Cannot transfer to yourself")
        return res.redirect("/transfer")
    }

    // ❌ Balance check
    if (sender.balance < transferAmount) {
        req.flash("error", "❌ Insufficient balance")
        return res.redirect("/transfer")
    }

    // 💰 Deduct from sender
    sender.balance -= transferAmount
    await sender.save()

    // 💰 Add to receiver
    receiver.balance += transferAmount
    await receiver.save()

    // 📊 Transaction for sender (DEBIT)
    await Transaction.create({
        userId: sender._id,
        type: "TRANSFER_OUT",
        amount: transferAmount,
        balanceAfter: sender.balance
    })

    // 📊 Transaction for receiver (CREDIT)
    await Transaction.create({
        userId: receiver._id,
        type: "TRANSFER_IN",
        amount: transferAmount,
        balanceAfter: receiver.balance
    })

    // update session
    req.session.user = sender

    req.flash("success", "✅ Transfer successful!")
    res.redirect("/dashboard")
})




const path = require("path");


router.get("/statement/pdf", isLoggedIn, async (req, res) => {
    const user = req.session.user;

    const transactions = await Transaction.find({
        userId: user._id
    }).sort({ date: -1 }).limit(15);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        "attachment; filename=MyBank-Statement.pdf"
    );

    doc.pipe(res);

    // -------------------------
    // HEADER (LOGO + TITLE)
    // -------------------------
    const logoPath = path.join(__dirname, "../public/logo.png");

    doc.image(logoPath, 40, 20, { width: 50 });

    doc
        .fontSize(20)
        .fillColor("#0b3d2e")
        .text("MyBank Statement", 100, 30);

    doc
        .fontSize(10)
        .fillColor("gray")
        .text(`Generated: ${new Date().toLocaleString()}`, 100, 55);

    doc.moveDown(2);

    // -------------------------
    // USER INFO BOX
    // -------------------------
    doc
        .rect(40, 90, 500, 60)
        .stroke();

    doc
        .fontSize(12)
        .fillColor("#000")
        .text(`Name: ${user.name}`, 50, 105)
        .text(`Email: ${user.email}`, 50, 120)
        .text(`Balance: ₹${user.balance}`, 300, 105);

    doc.moveDown(3);

    // -------------------------
    // TABLE HEADER
    // -------------------------
    const tableTop = 170;

    doc
        .fontSize(10)
        .fillColor("#ffffff")
        .rect(40, tableTop, 500, 20)
        .fill("#0b3d2e");

    doc
        .fillColor("white")
        .text("Type", 50, tableTop + 5)
        .text("Amount", 150, tableTop + 5)
        .text("Balance", 250, tableTop + 5)
        .text("Date", 350, tableTop + 5);

    // -------------------------
    // TABLE ROWS
    // -------------------------
    let y = tableTop + 25;

    transactions.forEach((txn, i) => {
        doc
            .fillColor("#000")
            .text(txn.type, 50, y)
            .text(`₹${txn.amount}`, 150, y)
            .text(`₹${txn.balanceAfter}`, 250, y)
            .text(new Date(txn.date).toLocaleString(), 350, y);

        // row line
        doc.moveTo(40, y + 15)
            .lineTo(540, y + 15)
            .strokeColor("#e0e0e0")
            .stroke();

        y += 25;
    });

    // -------------------------
    // FOOTER
    // -------------------------
    doc
        .fontSize(10)
        .fillColor("gray")
        .text(
            "This is a system generated statement from MyBank.",
            40,
            700,
            { align: "center" }
        );

    doc.end();
});


module.exports = router