const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const User = require("../models/userSchema")
const env = require("dotenv").config()


passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
     callbackURL:'https://gamerr.store/auth/google/callback'

},

async (accessToken, refreshToken, profile, done)=>{
    try {
        
        let user = await User.findOne({googleId:profile.id})
        if (!user) {
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id
            });
            await user.save();
        }
        done(null, user);
    } catch (err) {
        console.err("Error in Google Strategy:", error);
        done(err, null);
    }
}
))

passport.serializeUser((user,done)=>{
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id); // Retrieve the full user data
        done(null, user); // Store the full user data in the session
    } catch (error) {
        done(error, null);
    }
});


module.exports = passport;