const express = require("express");
const app = express();
const {pool} = require("./dbconfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const path = require("path");
const upload = require("express-fileupload");
const static = require("express-static")


const initializePassport = require("./passportConfig");

initializePassport(passport);


const PORT = process.env.PORT || 4000;


app.set("view engine", "ejs");
app.use(express.urlencoded({extended: false})); // Help to send user details from the front-end to the database

app.use(session({
    secret: "secret",

    resave: false,

    saveUninitialized: false

}));

app.use(passport.initialize())
app.use(passport.session());
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')))

// // app.use(express.static(path.join(__dirname,'public', './static/style.css', 'audios')));
// const staticPath = path.join(__dirname,'/style.css');
// // console.log(__dirname)
// app.use(express.static(staticPath));


// Get Requests
app.get("/", (req, res) =>{
    res.render("home")
}); 

app.get("/users/music", (req, res) =>{
    res.render("music")
}); 

app.get("/users/upload", (req, res) =>{
    res.render("upload")
}); 
app.get("/users/contact", (req, res) =>{
    res.render("contact")
}); 

app.get("/users/about", (req, res) =>{
    res.render("about")
}); 



app.get("/users/register", checkAuthenticated, (req, res)=>{
    res.render("register")
});

app.get("/users/login", checkAuthenticated, (req, res)=>{
    res.render("login")
});

app.get("/users/dashboard", checkNotAuthenticated, (req, res)=>{
    res.render("dashboard", {user: req.user.name});
});

//  trial this will be commented out if it donot work
// app.get("/users/music.html", (req, res)=>{
//     res.render("music.html");
// });

app.get("/users/logout", (req, res)=>{
    req.logOut(),
    req.flash("success_msg", "You have logged out");
    res.redirect("/users/login");
});


// Post Requests
app.post("/users/register", async (req, res)=>{
    let {name, email, password, password2} = req.body;
    console.log({
        name, 
        email, 
        password, 
        password2
    });


    let errors = [];

    if(!name || !email || !password || !password2){
        errors.push({message: "Please enter all fields"});
    }

    if(password.length < 6){
        errors.push({message: "Password should be at least six characters"});
    }

    if(password != password2){
        errors.push({message: "Passwords do not match, please check!!!"});
    }

    if(errors.length > 0){
        res.render("register", {errors});
    }
    else{
        // form validation has passed

        let hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);


        pool.query(
            `SELECT * FROM users 
            WHERE email = $1`, [email], (err, results)=>{
                if(err){
                    throw err
                }

                console.log(results.rows);
                if (results.rows.length > 0){
                    errors.push({message: "Email Already Taken!!!"});
                    res.render("register", {errors});
                }else{
                    pool.query(
                        `INSERT INTO users (name, email, password)
                        VALUES($1, $2, $3)
                        RETURNING id, password`, [name, email, hashedPassword], (err, results)=>{
                            if(err){
                                throw err
                            }
                            console.log(results.rows);
                            req.flash("success_msg", "You are now registered. Please log in");
                            res.redirect("/users/login");
                        }
                    )
                }
            }
        );
    }
});

app.post("/users/login", passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash:true
})

);

function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return res.redirect("/users/dashboard")
    }
    next();
}


function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }

    res.redirect("/users/login");
}

app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
});