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

console.log(getTime() + " - Checkie Local Server - Dev Build 0.2.0")

// Set API key to secure access to this API
//
var apikey = ""

try {
	const data = fs.readFileSync(__dirname + '/apikey.txt', 'utf8')
	console.log(getTime() + " - API Key loaded")
	apikey = data
} catch (err) {
	console.log(getTime() + " - No API Key")
}

// Set Secret key to decrypt data received from the server
//
var secretKey = ""

try {
	const data = fs.readFileSync(__dirname + '/secretkey.txt', 'utf8')
	console.log(getTime() + " - Secret Key loaded")
	secretKey = data
} catch (err) {
	console.log(getTime() + " - No Secret Key")
}

// Set Printer name from printer.txt file
//
var printerName = ""

try {
	const data = fs.readFileSync(__dirname + '/printer.txt', 'utf8')
	console.log(getTime() + " - Printer loaded - " + data)
	printerName = data
} catch (err) {
	console.log(getTime() + " - No Printer Loaded")
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
params.append('apikey', apikey)

axios.post('https://checkie.co.uk/print', params)
	.then(res => {
		prepareBadge(res.data)
	  })
	  .catch(error => {
		  if(error.response.status == 404) { } else {
			console.error(getTime() + " - " + error)
		  } 
	  })
	
},2000)


// Prepare a HTML file for the visitor badge
//
function prepareBadge(data) {
	
// Decrypt Data before using

var arrivalTime = new Date(+data.arrived).toLocaleTimeString("en-GB")
var arrivalDate = new Date(+data.arrived).toLocaleDateString("en-GB")

var arrival = arrivalTime + " - " + arrivalDate
if(data.customer == "") { customer = "..." } else { customer = data.customer }

try {
	const data = fs.readFileSync(__dirname + '/badge_layout.html', 'utf8')
	console.log(getTime() + " - Badge layout loaded")
	html = data
} catch (err) {
	return console.log(getTime() + " - No Badge Layout")
}

var id = Math.random().toString(36).substring(7)

	fs.writeFile(__dirname + '/' + id + '.html', html, err => {
	  if (err) {
		return console.error(getTime() + " - Error creating badge - " + err.code)
	  } else {
		  createPDF(id)
	  }
	})

}

// Create a PDF file from the HTML file for the Visitor badge
//
async function createPDF(id) {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(__dirname + '/' + id + '.html')
  const pdf = await page.pdf({ width: '960px', height: '1280px', scale: 2, landscape: true, printBackground: true, pageRanges: '1-1' }) 
  await browser.close();
  
  	fs.writeFile(__dirname + '/' + id + '.pdf', pdf, err => {
	  if (err) {
		fs.unlinkSync(__dirname + '/' + id + '.html')
		return console.error(getTime() + " - Error creating badge - " + err.code)
	  } else {
		printBadge(id)
	  }
	})
  
}

// Print the PDF Visitor badge file to the printer specified in printer.txt
//
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

// Get the current time (for logging purposes)
//
function getTime() {
	return new Date().toUTCString()
}

// Encryption and Decryption
//
function encrypt(message = '') {
    message = CryptoJS.AES.encrypt(message, secretKey)
    return message.toString()
}

function decrypt(message = ''){
    var code = CryptoJS.AES.decrypt(message, secretKey)
    var decryptedMessage = code.toString(CryptoJS.enc.Utf8)
    return decryptedMessage
}