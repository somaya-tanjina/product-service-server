const express = require("express");
const app = express();
var cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

        app.get("/products", async (req, res) => {
            const query = {};
            const cursor = await productCollection.find(query).toArray();
            res.send(cursor);
        });

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

        //cancel order

        app.delete("/product/:id",verifyjwt, async (req, res) => {
            const id = req.params.id;
            const querry = { _id: ObjectId(id) };
            const deletedItem = await orderCollection.deleteOne(querry);
            res.send(deletedItem);
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
