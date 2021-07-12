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

console.log(getTime() + " - Checkie Local Server - Dev Build 0.2.0")

var apikey = ""

try {
	const data = fs.readFileSync(__dirname + '/apikey.txt', 'utf8')
	console.log(getTime() + " - API Key loaded")
	apikey = data
} catch (err) {
	console.log(getTime() + " - No API Key - creating new key")
	
	apikey = crypto.randomBytes(20).toString('hex');
	
	fs.writeFile(__dirname + '/apikey.txt', apikey, err => {
  if (err) {
    return console.error(getTime() + " - Error saving new API Key: " + err.code)
  }
	return console.log(getTime() + " - Saving new API Key: " + apikey)
})

}

var printerName = ""

try {
	const data = fs.readFileSync(__dirname + '/printer.txt', 'utf8')
	console.log(getTime() + " - Printer loaded - " + data)
	printerName = data
} catch (err) {
	console.log(getTime() + " - No Printer")
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

console.log(getTime() + " - Running at https://localhost:9191/")

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
	console.log(getTime() + " - Receiving data")
		 
	fs.writeFile(__dirname + '/data.json', data, err => {
	  if (err) {
		return console.error(getTime() + " - " + err.code)
	  } else {
		data = JSON.parse(data)
		var lastEntry = data.people[data.people.length-1]
		if(arriving == "true" && lastEntry.type == "visitor") { prepareBadge(lastEntry, customer) }
		return console.log(getTime() + " - Saving data")
	  }
	})

} else {
	res.status(500).send('error')
	return console.error(getTime() + " - Cannot save - API Key incorrect")
}

})

app.get('/get', function(req, res) {
	
if(req.query.key === apikey) {

	console.log(getTime() + " - Requesting data")
	
	try {
		const data = fs.readFileSync(__dirname + '/data.json', 'utf8')
		console.log(getTime() + " - Sending data")
		res.send(data)
	} catch (err) {
		res.send("")
		console.error(getTime() + " - " + err.code)
	}
	
} else {
	res.status(500).send('error')
	return console.error(getTime() + " - Cannot save - API Key incorrect")
}

})

app.get('/getstaffnames', function(req, res) {
	
	if(req.query.key === apikey) {

		console.log(getTime() + " - Requesting staff names")
		
		try {
			const data = fs.readFileSync(__dirname + '/staff.json', 'utf8')
			console.log(getTime() + " - Sending staff names")
			res.send(data)
		} catch (err) {
			res.send("")
			console.error(getTime() + " - " + err.code)
		}
		
	} else {
		res.status(500).send('error')
		return console.error(getTime() + " - Cannot retrieve data - API Key incorrect")
	}

})

app.post('/poststaffnames', function(req, res) {
	
var data = JSON.stringify(req.body)

if(req.body.key === apikey) {

	data = JSON.parse(data)
	delete data.key
	data = JSON.stringify(data)
	console.log(getTime() + " - Receiving staff names data")
		 
	fs.writeFile(__dirname + '/staff.json', data, err => {
	  if (err) {
		res.error("error")
		return console.error(getTime() + " - " + err.code)
	  } else {
		res.send("success")
		return console.log(getTime() + " - Saving staff names data")
	  }
	})

} else {
	res.status(500).send('error')
	return console.error(getTime() + " - Cannot save - API Key incorrect")
}

})

setInterval(function(){
	
	try {
		const data = fs.readFileSync(__dirname + '/data.json', 'utf8')
		console.log(getTime() + " - Moving data to History")
		convertToCsv(JSON.parse(JSON.stringify(JSON.parse(data).people)))
		fs.unlink(__dirname + '/data.json', function(){
			console.log(getTime() + " - Data File Cleared")
		})
	} catch (err) {
		console.error(getTime() + " - " + err.code)
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

	<div style="position: relative;">
	<div style="height: 268px;position: absolute;top: 0;left: 0;padding: 10px;background-repeat: no-repeat;width: 500px;background: url(default_admin.png);background-attachment: fixed;background-size: 300px 100px;opacity: 0.04;">
	</div>
	<div style="height: 268px;z-index: 10; position: absolute;top: 0;left: 0;border-style: dashed;padding: 5px;width: 500px;">
	<h1 style="margin-block-start: 0px;margin-block-end: 0px;text-align: center;margin-bottom: 12px;">${customer}</h1>
    <div style="display: inline-block;margin-left: 26px;">
      <img style="width: 200px;" src="${visitor.picture}">
	</div>
	<div style="display: inline-block;margin-left: 6px;">
	  <h1 style="margin-block-start: 0px;margin-block-end: 0px;">Visitor</h1>
	  <h4 style="margin-block-start: 0px;margin-block-end: 0px;margin-top: 10px;">${visitor.fullName}</h4>
	  <h4 style="margin-block-start: 0px;margin-block-end: 0px;margin-top: 18px;">${visitor.company}</h4>
	  <h4 style="margin-block-start: 0px;margin-block-end: 0px;margin-top: 12px;">${visitor.purpose}</h4>
	  <h4 style="margin-block-start: 0px;margin-block-end: 0px;margin-top: 16px;">${arrival}</h4>
    </div>
	</div>
	</div>
</body>

</html>`

var id = Math.random().toString(36).substring(7)

	fs.writeFile(__dirname + '/' + id + '.html', html, err => {
	  if (err) {
		return console.error(getTime() + " - Error creating badge - " + err.code)
	  } else {
		  createPDF(id)
	  }
	})

}

async function createPDF(id) {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(__dirname + '/' + id + '.html')
  const pdf = await page.pdf({ format: 'A4' })
 
  await browser.close();
  
  	fs.writeFile(__dirname + '/' + id + '.pdf', pdf, err => {
	  if (err) {
		return console.error(getTime() + " - Error creating badge - " + err.code)
	  } else {
		  printBadge(id)
	  }
	})
  
}

async function printBadge(id) {
	try {
	var selectedPrinter = await printer.CmdPrinter.getByName(printerName)
	await selectedPrinter.print([ id + '.pdf' ])
	
	fs.unlinkSync(__dirname + '/' + id + '.html')
	fs.unlinkSync(__dirname + '/' + id + '.pdf')
	console.log(getTime() + " - Badge Printed to " + printerName)
	}
	catch (error) {

	console.log(getTime() + " - Error creating badge - " + error)
	fs.unlinkSync(__dirname + '/' + id + '.html')
	fs.unlinkSync(__dirname + '/' + id + '.pdf')
	}
}

function getTime() {
	return new Date().toUTCString()
}