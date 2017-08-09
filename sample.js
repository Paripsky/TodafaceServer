/*
 * Copyright 2013. Amazon Web Services, Inc. All Rights Reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
**/

// Load the SDK and UUID
const UPLOAD_IMAGE = "/uploadimage"
const RECOGNIZE_FACES = "/recognizefaces"
const COLLECTION_ID = "collection";
const FACES_TO_RECOGNIZE = 1;
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./awsConfig.json');
var uuid = require('node-uuid');

var express = require('express'),
  bodyParser = require('body-parser'),
  fs = require('fs'),
  path = require('path'),
  app = express();

// parse application/x-www-form-urlencoded
// parse application/json
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

var polly = new AWS.Polly();
let rekognition = new AWS.Rekognition();

var params = {
  OutputFormat: "mp3",
  SampleRate: "8000",
  Text: "All Gaul is divided into three parts",
  TextType: "text",
  VoiceId: "Joanna"
};

app.post('/image', function (req, res) {
  // polly.synthesizeSpeech(params, function (err, data) {
  //   if (err) console.log(err, err.stack); // an error occurred
  //   res.setHeader('Access-Control-Allow-Origin', '*');
  //   res.status(200).send(data); 
  // });
  let image = (req.body && req.body.image) || '';
  image = image.split("data:image/jpeg;base64,")[1];
  image = new Buffer(image, 'base64');
  // if (image != '') { image = getBinary(image) }
  if (image === '') return console.error('No image given');

  analyzeFaces(image)
    .then(indexFaces)
    .then(getDataForFace)
    .then(generateOrderStringToSpeak)
    .then(sendStringToPolly)
    .then(sendDataToClient(res))
    .catch(console.error);

  console.log("RECOGNIZE_FACES");
});

app.get('/polly', function (req, res) {
  params.Text = req.query.text || "I do work son";
  polly.synthesizeSpeech(params, function (err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  });
});

app.get('/', function (req, res) {
  var filePath = 'music.mp3';
  var stat = fs.statSync(filePath);
  var total = stat.size;
  if (req.headers.range) {
    var range = req.headers.range;
    var parts = range.replace(/bytes=/, "").split("-");
    var partialstart = parts[0];
    var partialend = parts[1];

    var start = parseInt(partialstart, 10);
    var end = partialend ? parseInt(partialend, 10) : total - 1;
    var chunksize = (end - start) + 1;
    var readStream = fs.createReadStream(filePath, { start: start, end: end });
    res.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Accept-Ranges': 'bytes', 'Content-Length': chunksize,
      'Content-Type': 'video/mp4'
    });
    readStream.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'audio/mpeg' });
    fs.createReadStream(path).pipe(res);
  }
});

app.listen(3000, function () {
  rekognition.createCollection({ CollectionId: COLLECTION_ID }, (err, payload) => {
    if (err) {
      if (err.statusCode !== 400)
        return console.error(err)
      else
        return console.log(err.message);
    };
    return console.log(payload.StatusCode);
  });

  console.log('Example app listening on port 3000!')
})

function analyzeFaces(image) {
  return new Promise((resolve, reject) => {
    rekognition.searchFacesByImage({
      CollectionId: COLLECTION_ID,
      // FaceMatchThreshold: ???
      Image: { Bytes: image },
      MaxFaces: FACES_TO_RECOGNIZE
    }, function (err, payload) {
      if (err) {
        // return console.error(err);
        reject(err);
      } else {
        resolve({image: image, payloadState: payload.FaceMatches})
      }
    });
  });
}

function indexFaces({image, payloadState = null}) {
  return new Promise((resolve, reject) => {
    if (payloadState && payloadState.length != 0) {
      const faceId = payloadState[0].Face.FaceId;
      resolve(faceId);
    } else {
      rekognition.indexFaces({
        CollectionId: COLLECTION_ID,
        DetectionAttributes: ["ALL", "DEFAULT"],
        Image: { Bytes: image }
      }, function (err, payload) {
        if (err) reject(err); //return console.error(err);
        
        if (payload.FaceRecords.length > 0) {
          console.log("successfuly added " + payload.FaceRecords.length + " faces to the collection");
          // todo-DB: add new face to DB
          resolve(payload.FaceRecords[0].Face.FaceId);
        } else {
          reject(err);
        }
      });
    }
  });
}

function getDataForFace(faceId) {
  return new Promise((resolve, reject) => {
    // todo-DB: get data for given faceId
    resolve({}); // Else reject
  });
  //return {}; // the DB data from DB
}

function generateOrderStringToSpeak(orderData = null) {
  return new Promise((resolve, reject) => {
    if (!orderData) {
      resolve('');
    } else {
      let string;
      // Create template -> DB model structure [POJO like]
      resolve(string);
    }
  });
}

function sendStringToPolly(string = '') {
  return new Promise((resolve, reject) => {
    let voiceStream;
    // Send to polly
    resolve(voiceStream);
  });
}

function sendDataToClient(response) {
  return (voiceStream) => {
    response.end(voiceStream);
    // Send the voice message generated by polly to the client
  }
}