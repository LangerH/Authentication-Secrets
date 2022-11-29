//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require('mongoose-findorcreate');

// const encrypt = require('mongoose-encryption');
// const md5= require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] });

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
     done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secret page.
    res.redirect("/secrets");
  });


app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.redirect("/login");
  }

});

app.get("/logout", function(req, res){
  req.logout(function(err) {
      if (err) { return next(err); }
        res.redirect("/");
  });

});

app.post("/register", function(req, res){

User.register({username: req.body.username}, req.body.password, function(err,user){
if (err) {
    console.log(err);
    res.redirect("/register");
} else {
  passport.authenticate("local")(req,res,function(){
    res.redirect("/secrets");
  });
}
});

});

app.post("/login", function(req, res){

 const user = new User({
   username: req.body.username,
   password: req.body.password
 });

 req.login(user, function(err){
   if (err) {
     console.log(err);
   } else {
     passport.authenticate("local")(req,res,function(){
       res.redirect("/secrets");
     });
   }
 })
});




// app.post("/register", function(req, res){
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
//       email: req.body.username,
//       // password:req.body.password
//       // password:md5(req.body.password)
//       password:hash
//     });
//     newUser.save(function(err){
//       if (err){
//         console.log(err);
//       }
//       else{
//         res.render("secrets");
//       }
//     });
//     });
//
//   });


// app.post("/login", function(req, res){
// const username = req.body.username;
// // const password = req.body.password;
// // const password = md5(req.body.password);
// const password = req.body.password;
// User.findOne({email:username},function(err,foundUser){
// if (err) {
//     console.log(err);
// }
// else{
//   if (foundUser){
//     // if (foundUser.password===password){
//     bcrypt.compare(password, foundUser.password, function(err, result) {
//       if (result === true){
//         res.render("secrets");
//       }
//       else{
//         res.send("Incorrect password");
//       }
//     });
//   }
//   else
//   {
//     res.send("Incorrect usename");
//   }
// }});
// });

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
