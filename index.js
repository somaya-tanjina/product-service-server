const express = require("express");
const app = express();
var cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");


const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rk7co.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

//jwt token
const verifyjwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "UnAuthorized access" });
    }
    // 6th step to verifyjwt token if it is authentic or not
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden access" });
        } else {
            req.decoded = decoded;
            next();
        }
    });
};

async function run() {
    try {
        await client.connect();
        const productCollection = client
            .db("manufacturer")
            .collection("products");

        const userCollection = client.db("manufacturer").collection("user");
        const orderCollection = client.db("manufacturer").collection("order");
        const paymentCollection = client.db("manufacturer").collection("payment");
        const reviewCollection = client.db("manufacturer").collection("review");

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;

            const requesterAccount = await userCollection.findOne({
                email: requester,
            });

            if (requesterAccount.role === "admin") {
                next();
            } else {
                res.status(403).send({ message: "forbidden Access" });
            }

            // await, next()
        };

        app.get("/products", async (req, res) => {
            const query = {};
            const cursor = await productCollection.find(query).toArray();
            res.send(cursor);
        });

        // delete product

        app.delete("/product/:id", verifyjwt,verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const querry = { _id: ObjectId(id) };
            const deletedItem = await productCollection.deleteOne(querry);
            res.send(deletedItem);
        });

        //get by id

        app.get("/product/:id", async (req, res) => {
            const id = req.params.id;
            const querry = { _id: ObjectId(id) };
            const product = await productCollection.findOne(querry);
            res.send(product);
        });

        //user
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = req.body;
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            const token = jwt.sign(
                { email: email },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "1h" }
            );
            res.send({ result, token });
        });

        //get User

        app.get("/users", verifyjwt, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        // get specific user

        app.get("/user/:email", verifyjwt, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            res.send(user);
        });

        // update User
        app.patch("/user/:email", verifyjwt, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedProfile = req.body;
            console.log(filter);
            const updatedDoc = {
                $set: {
                    name: updatedProfile.name,
                    number: updatedProfile.number,
                    location: updatedProfile.location,
                    education: updatedProfile.education,
                },
            };

            const updatedUser = await userCollection.updateOne(
                filter,
                updatedDoc
            );
            res.send(updatedUser);
        });

        // post Order

        app.post("/orders", async (req, res) => {
            const item = req.body;
            const result = await orderCollection.insertOne(item);
            res.send({ success: true, result });
            //console.log(result);
        });

        app.get("/orders", verifyjwt, async (req, res) => {
            const email = req.query.email;

            const decodedEmail = req.decoded.email;

            if (email === decodedEmail) {
                const query = { email: email };
                const bookings = await orderCollection.find(query).toArray();

                return res.send(bookings);
            } else {
                return res.status(403).send({ message: "fobidden Access" });
            }
        });

// update order paid or not
        app.patch("/order/:id", async (req, re) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                },
            };
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(
                filter,
                updatedDoc
            );
            res.send(updatedDoc);
        });


// get orderby id
        app.get("/orders/:id", verifyjwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        });


// pay Order



        app.post("/create-payment-intent", verifyjwt, async (req, res) => {
            const appoints = req.body;
            const price = appoints.price;
            const amount = price * 100;
            //console.log(amount);
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });


        //cancel order

        app.delete("/order/:id", verifyjwt, async (req, res) => {
            const id = req.params.id;
            const querry = { _id: ObjectId(id) };
            const deletedItem = await orderCollection.deleteOne(querry);
            res.send(deletedItem);
        });

        // get all order
        app.get("/alorders", verifyjwt, async (req, res) => {
            const query = {};
            const cursor = await orderCollection.find(query).toArray();
            res.send(cursor);
        });
        // post review
        app.post("/reviews", verifyjwt, async (req, res) => {
            const review = req.body;
            console.log(review);
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        // get reviews
        app.get("/reviews", async (req, res) => {
            const query = {};
            const cursor = await reviewCollection.find(query).toArray();
            res.send(cursor);
        });

        //Admin

        app.put("/users/admin/:email", verifyjwt,verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: "admin" },
            };
            const result = await userCollection.updateOne(filter, updateDoc);

            return res.send(result);
        });

        app.get("/admin/:email", verifyjwt, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === "admin";
            res.send({ admin: isAdmin });
        });

        //add product
        app.post("/products", verifyjwt, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });
    } finally {
        //await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
