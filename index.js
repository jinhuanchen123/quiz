import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";

import dotenv from 'dotenv';

const port = 3000;
const app = express();
const saltRound = 10;



dotenv.config();

// Connect to the database
const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect();




// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Routes
app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    const firstname=req.body.FirstName;
    const lastname=req.body.LastName;
 




    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkResult.rows.length > 0) {
            return res.status(400).send("User with this email already exists.");
        } else {
            bcrypt.hash(password, saltRound, async (err, hash) => {
                if (err) {
                    console.log("Error hashing password", err);
                } else {
                    const result = await db.query("INSERT INTO users(email,password,firstname,lastname) VALUES ($1,$2,$3,$4)", [email, hash,firstname,lastname]);
                    console.log(result);
                    
                    res.render("capital.ejs", { countries: await getCountries(), userEmail: email, score: null });
                }
            });
        }
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).send("An error occurred while registering the user.");
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const isPasswordCorrect = await bcrypt.compare(password, user.password);

            if (isPasswordCorrect) {
                res.render("capital.ejs", { countries: await getCountries(), userEmail: username, score: null });
            } else {
                res.status(401).send("Invalid username or password");
            }
        } else {
            res.status(401).send("Account does not exist");
        }
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).send("An error occurred while logging in.");
    }
});

async function getCountries() {
    const result = await db.query("SELECT * FROM capitals");
    return result.rows;
}

// Display country name in the capital.ejs
app.get("/country", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM capitals");
        const countries = result.rows;
        res.render("capital.ejs", { countries: countries, score: null });
    } catch (error) {
        console.error("Error fetching countries and capitals:", error);
        res.status(500).send("An error occurred while fetching data.");
    }
});
app.post("/check-answers", async (req, res) => {
    const email = req.body.username; 

    try {
        const result = await db.query("SELECT * FROM capitals");
        const countries = result.rows;
        let score = 0;

        countries.forEach((country) => {
            const userAnswer = req.body[`capital_${country.id}`];
            if (userAnswer === country.capital) {
                score++;
            }
        });

        // Update the user's score in the database
        await db.query("UPDATE users SET score = $1 WHERE email = $2", [score, email]);

        res.render("capital.ejs", { countries: countries, score: score, userEmail: email });
    } catch (error) {
        console.error("Error checking answers:", error);
        res.status(500).send("An error occurred while checking your answers.");
    }
});






app.listen(port, () => {
    console.log(`Server is running at port ${port}`);
});
