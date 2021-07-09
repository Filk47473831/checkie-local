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
const crypto = require('crypto')
const printer = require('cmd-printer')
const puppeteer = require('puppeteer')

console.log("Checkie Local Server - Dev Build 0.1.8")

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

var printerName = ""

try {
	const data = fs.readFileSync(__dirname + '/printer.txt', 'utf8')
	console.log("Printer loaded")
	printerName = data
} catch (err) {
	console.log("No Printer")
}

app.use(cors())
app.use(bodyParser.urlencoded({
	limit: '50mb',
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

app.post('/post', function(req, res) {
	
var data = JSON.stringify(req.body)

if(req.body.key === apikey) {

	data = JSON.parse(data)
	var arriving = data.arriving
	var customer = data.customer
	delete data.key
	delete data.arriving
	delete data.customer
	data = JSON.stringify(data)
	console.log("Receiving data")
		 
	fs.writeFile(__dirname + '/data.json', data, err => {
	  if (err) {
		return console.error(err.code)
	  } else {
		data = JSON.parse(data)
		var lastEntry = data.people[data.people.length-1]
		if(arriving == "true" && lastEntry.type == "visitor") { prepareBadge(lastEntry, customer) }
		return console.log("Saving data")
	  }
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

function prepareBadge(visitor, customer) {
	
var arrivalTime = new Date(+visitor.arrived).toLocaleTimeString("en-GB")
var arrivalDate = new Date(+visitor.arrived).toLocaleDateString("en-GB")

var arrival = arrivalTime + " - " + arrivalDate

var html = `<html>

<body style="font-family: Arial, Helvetica, sans-serif;">

	<div style="margin: 30px;border-style: dashed;padding: 20px;width: 500px;">
	<h1 style="margin-block-start: 0px;margin-block-end: 0px;text-align: center;margin-bottom: 22px;">${customer}</h1>
    <div style="display: inline-block">
      <img style="width: 200px;" src="${visitor.picture}">
	</div>
	<div style="display: inline-block;margin-left: 6px;">
	  <h1 style="margin-block-start: 0px;margin-block-end: 0px;">Visitor</h1>
	  <h4 style="margin-block-start: 0px;margin-block-end: 0px;margin-top: 10px;">${visitor.fullName}</h4>
	  <h4 style="margin-block-start: 0px;margin-block-end: 0px;margin-top: 18px;">${visitor.company}</h4>
	  <h4 style="margin-block-start: 0px;margin-block-end: 0px;margin-top: 12px;">${visitor.purpose}</h4>
	  <h4 style="margin-block-start: 0px;margin-block-end: 0px;margin-top: 12px;">${arrival}</h4>
    </div>
	</div>

</body>

</html>`

var id = Math.random().toString(36).substring(7)

	fs.writeFile(__dirname + '/' + id + '.html', html, err => {
	  if (err) {
		return console.error(err.code)
	  } else {
		  createPDF(id)
	  }
	})

}

async function createPDF(id) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(__dirname + '/' + id + '.html');
  const pdf = await page.pdf({ format: 'A4' });
 
  await browser.close();
  
  	fs.writeFile(__dirname + '/' + id + '.pdf', pdf, err => {
	  if (err) {
		return console.error(err.code)
	  } else {
		  printBadge(id)
	  }
	})
  
}

async function printBadge(id) {
	var selectedPrinter = await printer.CmdPrinter.getByName(printerName)
	await selectedPrinter.print([ id + '.pdf' ])
	
	fs.unlinkSync(__dirname + '/' + id + '.html')
	fs.unlinkSync(__dirname + '/' + id + '.pdf')
}