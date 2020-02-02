const express = require("express");
const Joi = require("joi");

const firebase = require("./firebaseCred/starbugsFirebase");
const app = express();

const db = firebase.db;
const admin = firebase.admin;

const colUser = db.collection("users");
const colCamera = db.collection("cameras");

app.use(express.json());
app.use(
    express.urlencoded({
        extended: true
    })
);

app.get("/", (req, res) => {
    res.send("In the root");
});

app.post("/users", (req, res) => {
    const data = {
        userName: req.body.name,
        userEmail: req.body.email,
        userNumber: req.body.number,
        userAuthId: req.body.authid,
        userBranch: req.body.branch,
        userToken: req.body.token
    };

    db.collection("users")
        .add(data)
        .then(docRef => {
            console.log(docRef.id);
            res.send(data);
        })
        .catch(err => {
            console.log(err);
            res.send(err);
        });
});

app.get("/users/search", (req, res) => {
    if (Object.keys(req.query).length == 0) {
        res.status(400).send("Need atleast single query param");
        return;
    }

    let users = [];

    let queryParam = {
        name: "userName",
        email: "userEmail",
        number: "userNumber",
        authid: "userAuthId",
        branch: "userBranch"
    };

    var query = colUser;

    for (q in req.query) {
        if (!queryParam.hasOwnProperty(q)) {
            res.status(400).send("Invalid query parameter!!!");
            return;
        }

        query = query.where(queryParam[q], "==", req.query[q]);
    }

    query
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                users.push(doc.data());
            });

            res.send(users);
        })
        .catch(err => {
            res.send(err);
        });
});

app.get("/users", (req, res) => {
    let users = [];

    colUser
        .get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                users.push(doc.data());
            });

            console.log(snapshot);
            res.send(users);
        })
        .catch(err => {
            res.send(err);
        });
});

app.post("/message/:authid", (req, res) => {
    // This registration token comes from the client FCM SDKs.

    var registrationToken = "";
    var docId = "";
    colUser
        .where("userAuthId", "==", req.params.authid)
        .get()
        .then(snapshot => {
            if (snapshot.empty) res.status(404).send("no such AuthId found");

            snapshot.forEach(doc => {
                registrationToken = doc.data().userToken;
                docId = doc.id;
            });

            currentDate = getCurrentDate();
            // console.log("\n\n\n\nRegistration Token => " + registrationToken)
            const data = {
                eventId: currentDate + "-" + req.body.id,
                eventLatlng: req.body.latlng,
                eventStartTime: currentDate
            };
            var message = {
                data: data,
                token: registrationToken
            };

            // Send a message to the device corresponding to the provided
            // registration token.
            admin
                .messaging()
                .send(message)
                .then(response => {
                    // Response is a message ID string.

                    colUser
                        .doc(docId)
                        .collection("notifications")
                        .doc(currentDate + "-" + req.body.id)
                        .set(data)
                        .then(docRef => {
                            console.log(docRef.id);
                        })
                        .catch(err => {
                            console.log(err);
                        });

                    colCamera
                        .doc(req.body.id)
                        .collection("history")
                        .doc(currentDate)
                        .set(data)
                        .then(docRef => {
                            console.log(docRef.id);
                        })
                        .catch(err => {
                            console.log(err);
                        });

                    res.send("Successfully sent message:" + response);
                })
                .catch(err => {
                    res.send("Error sending message:" + err);
                });
        })
        .catch(err => {
            console.log("\n\n\n\nError\n\n\n" + err);
            res.status(500).send(err);
        });
});

function formatDateInput(value) {
    extra = "";
    if (value < 10) extra = "0";

    return extra + value;
}

function getCurrentDate() {
    currentDate = new Date();

    year = "" + currentDate.getFullYear();
    month = formatDateInput(currentDate.getMonth() + 1);
    day = formatDateInput(currentDate.getDate());
    hour = formatDateInput(currentDate.getHours());
    mins = formatDateInput(currentDate.getMinutes());

    return year + month + day + hour + mins;
}

app.listen(4769, () => {
    console.log("Listening at port 4769");
});
