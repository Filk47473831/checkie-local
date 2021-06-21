const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const request = require('request')
const fs = require('fs')
const http = require('http')
const https = require('https')
const privateKey  = fs.readFileSync('selfsigned.key', 'utf8')
const certificate = fs.readFileSync('selfsigned.crt', 'utf8')
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
    return console.error(err)
  }
	return console.log("Receiving data")
})

})

app.get('/get', function(req, res) {
	
	try {
	  const data = fs.readFileSync(__dirname + '/data.json', 'utf8')
	  console.log("Sending data")
	  res.send(data)
	} catch (err) {
	fs.open(__dirname + '/data.json', 'w', function (err, file) {
		res.send("")
  		if (err) throw err;
	})
	console.error(err)
	}

})


/* async function convertToCsv(data) {
   const csv = new objectsToCsv(data)
   await csv.toDisk('./History.csv', { append: true })
}

var convertData = [{"fullName":"Chris Groves","company":"JSPC","carReg":"gu69 owa","purpose":"ICT","arrived":"1624279103112","departed":"1624279108353"},{"fullName":"Hannah Wallace","company":"H Samuel","carReg":"NO car","purpose":"TA","arrived":"1624279128489","departed":"1624279135073"}]

convertToCsv(convertData) */

