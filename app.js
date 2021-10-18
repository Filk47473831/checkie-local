// Set constants
//
const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const request = require('request')
const fs = require('fs')
const axios = require('axios')
const CryptoJS = require('crypto-js')
const printer = require('cmd-printer')
const puppeteer = require('puppeteer')
const machineId = require('node-machine-id')
const find = require('local-devices');

log('Checkie Local Server Started - Dev Build 0.2.0')

// Get Settings from settings.ini
//
var settings
var authId = ''
var apiKey = ''
var dhcp = ''
var printerName = ''

async function getPrinters() {
	var printers = await printer.CmdPrinter.getAll()
	var printersArray = []
	printers.forEach(function(item) {
		printersArray.push(item._name)
	})
	var writePrinters = printersArray.join('\r\n')
	fs.writeFile('printers.txt', writePrinters, function(err) {
    if(err) {
        return console.log(getTime() + ' - ' + err)
    }
	})
}

getPrinters()

try {
	const data = fs.readFileSync('settings.ini', 'utf8')
	
	settings = JSON.parse(data)
	authId = settings.authid
	apiKey = settings.apikey
	
	if(settings.dhcp != '' && settings.dhcp != undefined) {
	dhcp = settings.dhcp
	log('DHCP range set to: ' + dhcp)
	} else {
		log('No DHCP range set')
	}
	
	if(authId != '' && authId != undefined) {
		log('Authorisation ID - ' + authId)
	}
	if(apiKey != '' && apiKey != undefined) {
		log('API key loaded - ' + apiKey)
	} else {
		log('No API key loaded')
	}

} catch (err) {
	
	var settings = {}
	authId = machineId.machineIdSync()
	settings.authid = authId
	settings.apikey = ''
	
	var writeSettings = JSON.stringify(settings)
	fs.writeFile('settings.ini', writeSettings, function(err) {
    if(err) {
        return console.log(getTime() + ' - ' + err);
    }
		log('Generated New Authorisation ID - ' + authId)
		log('No API key loaded')
	})
}


// Generate authorisation ID to add to Checkie account
//

try {
	if(authId == '' || authId == undefined) { 
	
	authId = machineId.machineIdSync()
	settings.authid = authId
	var writeSettings = JSON.stringify(settings)
	fs.writeFile('settings.ini', writeSettings, function(err) {
    if(err) {
        return console.log(getTime() + ' - ' + err);
    }
		log('Generated New Authorisation ID - ' + authId)
	})
	
	}
} catch (err) {
	log('Unable to generate Authorisation ID')
}


// Configure local server parameters
//
app.use(cors())
app.use(bodyParser.urlencoded({
	limit: '128mb',
    extended: true
}))


// Check for new print jobs
//
setInterval(function(){

var params = new URLSearchParams()
params.append('authid', authId)
params.append('apikey', apiKey)

try {

axios.post('https://checkie.co.uk/print', params)
	.then(res => {
		prepareBadge(res.data)
	  })
	  .catch(error => {
		  if(error.response.status == 404) { } else {
			log(error)
		  } 
	  })
	  
} catch (error) {
	log(error)
}
	
},2000)


// Prepare a HTML file for the visitor badge
//
function prepareBadge(data) {
	
var printerName = data.printerName
var arrivalTime = new Date(+data.arrived).toLocaleTimeString('en-GB')
var arrivalDate = new Date(+data.arrived).toLocaleDateString('en-GB')

var arrival = arrivalTime + ' - ' + arrivalDate
if(data.customer == '') { customer = '...' } else { customer = data.customer }

try {
	var html = `<html>

<body style="font-family: Arial, Helvetica, sans-serif;">

	<div style="height: 100%; position: relative;">
	<div style="height: 100%; position: absolute; top: 0; left: 0; padding: 10px; width: 100%; background: url(default_admin.png); background-attachment: fixed; background-size: 300px 122px; opacity: 0.04;">
	</div>
	<div style="display: block;overflow: hidden;height: 391px;z-index: 10;position: relative;top: 0;left: 0;padding: 5px;width: 668px;">
	<h1 style="padding-left: 10px;white-space: nowrap;position: absolute;text-align: center;margin-top: 7px;margin-bottom: 41px;font-size: 3rem;top: 17px;padding-right: 10px;">${customer}</h1>
    <div style="position: absolute;display: inline-block;left: 8px;top: 106px;">
      <img style="max-height: 330px;max-width: 323px;" src="${data.picture}">
	</div>
	<div style="top: 95px;position: absolute;display: block; left: 333px; overflow:hidden;">
	  <h1 style="font-size: 4rem;margin-block-start: 0px;margin-block-end: 0px;">Visitor</h1>
	  <h4 style="font-size: 2.5rem;margin-block-start: 0px;margin-block-end: 0px;margin-top: 14px;">${data.fullName}</h4>
	  <h4 style="white-space: nowrap!important;font-size: 1.5rem;margin-block-start: 0px;margin-block-end: 0px;margin-top: 12px;">${data.company}</h4>
	  <h4 style="font-size: 1.5rem;margin-block-start: 0px;margin-block-end: 0px;margin-top: 12px;">${data.purpose}</h4>
	  <h4 style="font-size: 2rem;margin-block-start: 0px;margin-block-end: 0px;margin-top: 12px;">${arrival}</h4>
    </div>
	</div>
	</div>

</body>
</html>`
	
	log('Badge layout loaded')
	
	var id = Math.random().toString(36).substring(7)
	createPDF(id, html, printerName)
	
} catch (err) {
	return log('No Badge layout')
}



}

// Create a PDF file from the HTML file for the Visitor badge
//
async function createPDF(id, html, printerName) {
			
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()    
  await page.setContent(html)
  const pdf = await page.pdf({ width: '960px', height: '1280px', scale: 2, landscape: true, printBackground: true, pageRanges: '1-1' }) 
  await browser.close()
  
  	fs.writeFile(id + '.pdf', pdf, err => {
	  if (err) {
		return log('Error creating badge (2) - ' + err.code)
	  } else {
		printBadge(id, printerName)
	  }
	})
  
}

// Print the PDF Visitor badge file to the printer specified in printer.txt
//
async function printBadge(id, printerName) {
		
	try {
		setTimeout(function(){
			fs.unlinkSync(id + '.pdf')
		},60000)
		var selectedPrinter = await printer.CmdPrinter.getByName(printerName)
		await selectedPrinter.print([ id + '.pdf' ])
		log('Badge Printed to ' + printerName)
	}
	catch (error) {
		log('Error creating badge (3) - ' + error)
		fs.unlinkSync(id + '.pdf')
	}
}

// Scan local network for devices
//
function scanLocalNetwork(){
	find(dhcp).then(devices => {
		sendDevices(devices)
	})
}

scanLocalNetwork()
setInterval(scanLocalNetwork, 120000)

// Post device list to Checkie server for processing
//
function sendDevices(devices) {
		
	try {
		
	var params = new URLSearchParams()
	params.append('authid', authId)
	params.append('apikey', apiKey)
	params.append('devices', JSON.stringify(devices))

	axios.post('https://checkie.co.uk/devices', params)
		.catch(error => {
			  if(error.response.status == 404) { } else {
				log(error)
			  } 
		})
	} catch (error) {
		log(error)
	}
	
	  
}

// Get the current time (for logging purposes)
//
function getTime() {
	return new Date().toUTCString()
}

// Generate Connection ID string
//
function generateString(length, characterCase = false) {
  
    var result = ''
    var characters = ''
    
    if(characterCase) {
      characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    } else {
      characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    }
    
    var charactersLength = characters.length
    for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * 
     charactersLength))
       }
    return result
  
}

// Write to log file
//
function log(message) {
	
	message = getTime() + ' - ' + message + '\r\n'
	
	fs.appendFile('log.txt', message, function (err) {
	  if (err) throw err
	})
	
	fs.readFile('log.txt', 'utf8', function(err, data){
		if (err){
			throw err
		}
		var linesCount = data.split('\r\n').length
		if(linesCount > 2000) {
			var wantedLines = data.split('\r\n').slice(1)
			wantedLines = wantedLines.join('\r\n')
			fs.writeFile('log.txt', wantedLines, function (err) {
				if (err) throw err
			})
		}
	})

}
