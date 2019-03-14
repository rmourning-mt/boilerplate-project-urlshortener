'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors');
var shorturl = require('./shorturl');

var app = express();

// Basic Configuration
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({
  extended: false
});
var port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGOLAB_URI, {
  useNewUrlParser: true
});

app.use(cors());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.post("/api/shorturl/new", jsonParser, urlencodedParser, function (req, res) {
  var url = req.body.url;
  shorturl.create(url, function (err, shortId) {
    if (err) {
      res.json({
        "error": err
      });
    } else {
      res.json({
        "original_url": url,
        "short_url": shortId
      });
    }
  });
});

app.get("/api/shorturl/:short_id", function (req, res) {
  shorturl.get(req.params.short_id, function (err, originalUrl) {
    // TODO: support rendering HTML pages for non-successful result
    if (err) {
      res.status(500).send("Internal Server Error: " + err);
    } else if (!originalUrl) {
      res.status(404).send("Not Found");
    } else {
      res.redirect(originalUrl);
    }
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});
