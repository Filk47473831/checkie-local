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
  // res.send("Checkie Local Server Component")
  res.render('index.html');
})

console.log("Running at https://localhost:9191/")

app.get('/post', function(req, res) {
	
var data = JSON.stringify(req.query)
	 
fs.writeFile(__dirname + '/data.json', data, err => {
  if (err) {
    return console.error(err.code)
  }
	return console.log("Receiving data")
})

})

app.get('/get', function(req, res) {

	console.log("Checkie requesting data")
	
	try {
		const data = fs.readFileSync(__dirname + '/data.json', 'utf8')
		console.log("Sending data")
		res.send(data)
	} catch (err) {
		res.send("")
		console.error(err.code)
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