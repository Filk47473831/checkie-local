const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const request = require('request')
const fs = require('fs')
const http = require('http')
const https = require('https')
const privateKey  = fs.readFileSync('checkie.key', 'utf8')
const certificate = fs.readFileSync('checkie.crt', 'utf8')
const credentials = {key: privateKey, cert: certificate}
const objectsToCsv = require('objects-to-csv')
const crypto = require("crypto");

console.log("Checkie Local Server - Dev Build 0.1.3")

var apikey = ""

try {
	const data = fs.readFileSync(__dirname + '/apikey.txt', 'utf8')
	console.log("API Key loaded")
	apikey = data
} catch (err) {
	console.log("No API Key - creating new key")
	
	apikey = crypto.randomBytes(20).toString('hex');
	
	fs.writeFile(__dirname + '/apikey.txt', apikey, err => {
  if (err) {
    return console.error("Error saving new API Key: " + err.code)
  }
	return console.log("Saving new API Key: " + apikey)
})

}	

app.use(cors())
app.use(bodyParser.urlencoded({
    extended: true
}))

app.get('public', function (req, res, next) {
  next()
})

app.use(express.static('public'))

var httpServer = http.createServer(app)
var httpsServer = https.createServer(credentials, app)

httpsServer.listen(9191)

app.get('/',function(req,res) {
  res.render('index.html');
})

console.log("Running at https://localhost:9191/")

app.get('/post', function(req, res) {
	
var data = JSON.stringify(req.query)

if(req.query.key === apikey) {

	data = JSON.parse(data)
	delete data.key
	data = JSON.stringify(data)
	console.log("Receiving data " + data)
		 
	fs.writeFile(__dirname + '/data.json', data, err => {
	  if (err) {
		return console.error(err.code)
	  }
		return console.log("Saving data")
	})

} else {
	res.status(500).send('error')
	return console.error("Cannot save - API Key incorrect")
}

})

app.get('/get', function(req, res) {
	
if(req.query.key === apikey) {

	console.log("Checkie requesting data")
	
	try {
		const data = fs.readFileSync(__dirname + '/data.json', 'utf8')
		console.log("Sending data")
		res.send(data)
	} catch (err) {
		res.send("")
		console.error(err.code)
	}
	
} else {
	res.status(500).send('error')
	return console.error("Cannot save - API Key incorrect")
}

})

app.get('/getstaffnames', function(req, res) {
	
	if(req.query.key === apikey) {

		console.log("Checkie requesting staff names")
		
		try {
			const data = fs.readFileSync(__dirname + '/staff.json', 'utf8')
			console.log("Sending staff names")
			res.send(data)
		} catch (err) {
			res.send("")
			console.error(err.code)
		}
		
	} else {
		res.status(500).send('error')
		return console.error("Cannot retrieve data - API Key incorrect")
	}

})

setInterval(function(){
	
	try {
		const data = fs.readFileSync(__dirname + '/data.json', 'utf8')
		console.log("Moving data to History")
		convertToCsv(JSON.parse(JSON.stringify(JSON.parse(data).people)))
		fs.unlink(__dirname + '/data.json', function(){
			console.log("JSON Data File Cleared")
		})
	} catch (err) {
		console.error(err.code)
	}
	
},86400000)

async function convertToCsv(data) {
   const csv = new objectsToCsv(data)
   await csv.toDisk('./History.csv', { append: true })
}