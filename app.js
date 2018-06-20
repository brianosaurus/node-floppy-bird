var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');


const Mobius = require("@mobius-network/mobius-client-js");
var app = express();
module.exports = app;

// view engine setup
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));


// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use((req, res, next) => {
  const { APP_KEY } = req.webtaskContext.secrets;
  const { APP_DOMAIN } = req.webtaskContext.meta;

  expressJwt({
    secret: APP_KEY,
    issuer: `https://${APP_DOMAIN}/`,
    algorithms: ['HS256'],
    getToken
  })(req, res, next);
});

// GET /balance
app.get("/balance", async (req, res, next) => {
  try {
    const { APP_KEY } = req.webtaskContext.secrets;
    const dapp = await Mobius.AppBuilder.build(APP_KEY, req.user.sub);

    res.json({balance: dapp.userBalance});
  } catch (e) {
    next(e);
  }
});

// POST /pay
app.post("/pay", async (req, res, next) => {
  try {
    const { APP_KEY } = req.webtaskContext.secrets;
    const dapp = await Mobius.AppBuilder.build(APP_KEY, req.user.sub);

    const { amount, target_address } = req.body;

    if (amount === null || isNaN(Number(amount))) {
      return res.status(400).json({ error: "Invalid amount" })
    }

    const response = await dapp.charge(amount, target_address);
    res.json({
      status: "ok",
      tx_hash: response.hash,
      balance: dapp.userBalance
    });
  } catch (e) {
    next(e);
  }
});

// GET /auth
// Generates and returns challenge transaction XDR signed by application to user
app.get("/auth", (req, res) => {
  res.send(
    MobiusClient.Auth.Challenge.call(
      APPLICATION_SECRET_KEY         // SA2VTRSZPZ5FIC.....I4QD7LBWUUIK
    )
  );
});

// POST /auth
// Validates challenge transaction. It must be:
//  - Signed by application and requesting user.
//  - Not older than 10 seconds from now (see MobiusClient.Client.strictInterval`)
app.post("/auth", (req, res) => {
  try {
    const token = new MobiusClient.Auth.Token(
      APPLICATION_SECRET_KEY,       // SA2VTRSZPZ5FIC.....I4QD7LBWUUIK
      req.query.xdr,                // Challnge transaction
      req.query.public_key          // User's public key
    );

    // Important! Otherwise, token will be considered valid.
    token.validate();

    // Converts issued token into hash and sends it to user
    res.send(token.hash("hex"));
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.listen(process.env.PORT);


