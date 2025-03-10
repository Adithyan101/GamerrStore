const express = require("express")
const app = express()
const path = require("path")
const dotenv = require("dotenv")
dotenv.config()
const session = require("express-session")
const passport = require("./config/passport")
const db = require("./config/db")
const userRouter = require("./routes/userRouter")
const adminRouter = require("./routes/adminRouter")
const multer = require('multer');
db()



// Middleware to disable caching
app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}))

app.use(passport.initialize());
app.use(passport.session())


app.set("view engine", "ejs")
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')])
app.use(express.static(path.join(__dirname, "public")))

app.use("/admin", adminRouter)
app.use("/", userRouter)



app.listen(process.env.PORT, () => {
    console.log("server is running");
})

