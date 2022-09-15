//jshint esversion:6
//
//<--- used to demonstarte the ecryption using environmental variable

require('dotenv').config()
const express = require("express");
const app = express();
const ejs = require("ejs");
const findOrCreate = require("mongoose-findorcreate");


app.use(express.static("public"));


const bodyparser = require('body-parser')
app.use(bodyparser.urlencoded({ extended: false }))

const mongoose = require("mongoose");
//var encrypt = require('mongoose-encryption');

//md5 hashing function ecryption
//const md5 = require("md5");

// const bcrypt = require('bcrypt');
// const saltRounds = 10;

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(session({
    secret: "we keep your secret",
    resave: false,
    saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());


const  mongoAtlasUri =
        "mongodb+srv://admin-sachin:D7bmskmxN634N18A@firstcluster.4rc4s.mongodb.net/quotesDatabase?retryWrites=true&w=majority";

try {
    // Connect to the MongoDB cluster
     mongoose.connect(
      mongoAtlasUri,
      { useNewUrlParser: true },
      () => console.log(" Mongoose is connected")
    );

  } catch (e) {
    console.log("could not connect");
  }


const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId : String,
    secrets: {
        type: [String]
    }
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt, { secret: process.env.SECRET  , encryptedFields: ["password"] });

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });

  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));







app.set('view engine', 'ejs')

app.get('/', function (req, res) {
    res.render("home");
})


app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] }));


app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication,redirect home.
        res.redirect("/secrets");
    });

app.get('/register', function (req, res) {
    res.render("register");
})

app.get('/login', function (req, res) {
    res.render("login");
})

app.get("/secrets", function (req, res) {
    User.find(function(err,foundUser)
    {
        if(err)
        {
            console.log(err);
        }
        else{
            if(foundUser){
                res.render("secrets",{usersWithSecrets:foundUser})
            }
        }
    })
})


app.post('/register', function (req, res) {

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register")
        }

        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }



    })
})










// const email = req.body.username;

// bcrypt.hash(req.body.password, saltRounds, function (err, hash) {

//     const newUser = new User({
//         email: email,
//         password: hash
//     })
//     newUser.save(function (err) {
//         if (err) {
//             console.log(err);
//         }
//         else {
//             res.render("secrets");
//         }
//     })

// });




app.post('/login', function (req, res) {


    const newUser = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(newUser, function (err) {
        if (err) {
            console.log(err);

        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect('/secrets')
            })
        }
    });




    // const email = req.body.username;
    // User.findOne({email:email}, function(err,user){
    //     if(err)
    //     {
    //         console.log(err);
    //     }
    //     else{
    //         bcrypt.compare(req.body.password, user.password,function(err,result){
    //             if(result===true)
    //             {
    //                 res.render("secrets")
    //             }
    //             else{
    //                 console.log(err)
    //             }
    //         })
    //     }
    // })
})

app.get('/logout', function (req, res) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.get("/submit", function(req,res){
    if (req.isAuthenticated()) {
        res.render("submit");
    }
    else {
        res.redirect("/login");
    }
})

app.post("/submit", function(req,res){
    const submittedSecret = req.body.secret;
    console.log((req.user.id));
    User.findById(req.user.id, function(err, foundUser) {
        if(err){
            console.log(err);
        }
        else{
            if(foundUser)
            {
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    })
})


app.listen(3000, function (req, res) {
    console.log("server started on port 3000");
})
