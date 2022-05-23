const express = require("express");
const app = express();
var cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
//middleware
app.use(cors());
app.use(express.json());

//pass  E5tcBWOSJGWyiVv6
//user manufacturer

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
    "mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rk7co.mongodb.net/?retryWrites=true&w=majority";
//console.log(uri);
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});
client.connect((err) => {
    const collection = client.db("test").collection("devices");
    // perform actions on the collection object
    client.close();
});

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
