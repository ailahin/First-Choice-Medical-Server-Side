const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require("mongodb").ObjectId;
const stripe = require('stripe')('sk_test_51Jw7zBDIsXfdnAuBD8JtsE7Yn2kOrd9QG7nhj89HMGZaEgcsKk8STPy4DolpJ5YlBnPy75nahEFF9YvmF11AmmCd00QapARv7W');

const port = 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sw8s1ml.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function run() {
    try {
        await client.connect();
        const database = client.db('medical-center');
        const appointmentsCollection = database.collection('appointments');
        const usersCollection = database.collection('users');
        const paymentsCollection = database.collection('payment');
        const doctorsCollection = database.collection('doc');
        const blogsCollection = database.collection('blogs');

        //------------------------ GET -------------------------//
        app.get('/appointment', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = appointmentsCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
        })


        app.get("/doctor", async (req, res) => {
            const cursor = doctorsCollection.find({});
            const doctors = await cursor.toArray();
            res.send(doctors);
        });

        app.get("/blogs", async (req, res) => {
            const cursor = blogsCollection.find({});
            const blogs = await cursor.toArray();
            res.send(blogs);
        });


        app.get("/appointments", async (req, res) => {
            const cursor = appointmentsCollection.find({});
            const appointments = await cursor.toArray();
            res.send(appointments);
        });

        app.get('/appointments/:id', async (req, res) => {
            const iD = { _id: ObjectId(req.params.id) };
            const result = await appointmentsCollection.findOne(iD);
            res.json(result)
        })
        app.get("/users", async (req, res) => {
            const cursor = usersCollection.find({});
            const Events = await cursor.toArray();
            res.send(Events);
          });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })


        //-------------------------- POST ---------------------------//

        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentsCollection.insertOne(appointment);
            res.json(result)
        });

        app.post('/blogs', async (req, res) => {
            const result = await blogsCollection.insertOne(req.body);
            res.json(result)
        });

        app.post('/users', async (req, res) => {
            const result = await usersCollection.insertOne(req.body);
            res.json(result)
          });


        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.post("/doctor", async (req, res) => {
            const result = await doctorsCollection.insertOne(req.body);
            res.json(result);
        });


        // ------------------------ PUT ----------------------//

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const updateDoc = { $set: { role: 'admin' } };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);
        })

        app.delete("/appointments/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await appointmentsCollection.deleteOne(query);
            console.log("Deleting appointment with id ", result);
            res.json(result);
        })

    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Medical Center!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})
