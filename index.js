const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const Discord = require('discord.js')
const client = new Discord.Client()
const request = require('request');
const discordUserMap = {
  "303258465969766400": {"name": "Wu", "position": "TSSQCC", "squadronCommander": true},
  "619597742968143875": {"name": "Andrews", "position": "COT", "squadronCommander": false},
  "620007911543930940": {"name": "White", "position": "CFLTCC", "squadronCommander": false},
  "620435878032179200": {"name": "Notice", "position": "AFLTCC", "squadronCommander": false},
  "619553613873807384": {"name": "Mackenzie", "position": "DCO", "squadronCommander": false},
  "620445693022306315": {"name": "Rosero", "position": "SAO", "squadronCommander": false},
  "380120256334790668": {"name": "Rathjen", "position": "BFLTCC", "squadronCommander": false},
  "458868654008958976": {"name": "Jones", "position": "DFLTCC", "squadronCommander": false},
  "620043784339849217": {"name": "Fischer", "position": "TSQCC", "squadronCommander": true},
  "619952296989687819": {"name": "Colaizzo", "position": "PFO", "squadronCommander": false}
}
var discordToken;
// Load client secrets from a local file.
fs.readFile('apikey.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Apps Script API.
  content = JSON.parse(content);
  discordToken = content.key;
  client.login(discordToken);
});



client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on('message', msg => {
//console.log(msg);
  if (msg.content === '!generateAAR') {
    msg.author.send("I'll help you finish that AAR in no time!");

    const collector = new Discord.MessageCollector(msg.channel, m => m.author.id === msg.author.id, {time: 1000000000, max: 8});
  	const name = discordUserMap[msg.author.id.toString()].name;
  	const position = discordUserMap[msg.author.id.toString()].position;
  	const squadronCommander = discordUserMap[msg.author.id.toString()].squadronCommander;
  	const positiveMessage = "Please reply with a positive:";
  	const negativeMessage = "Please reply with a negative and how you will fix it going forward:";
  	let collectCount = 0;
  	msg.author.send(positiveMessage);

  	collector.on('collect', message => {
  		console.log("collected: " + message.content);
  		callAppScriptFunction('updateAAR', position, collectCount, message.content);
  		collectCount++;
  		if (collectCount == 1 || squadronCommander == true && collectCount == 2){
  			msg.author.send(positiveMessage);
  		} else if (collectCount < 4) {
  			msg.author.send(negativeMessage);
  		}
  	});

  	collector.on('end', collected => {
  		if (collectCount == 4){
  			msg.author.send("Thank you! Your response has been recorded in this week's AAR.");
  		} else {
  			msg.author.send("It looks like this session has timed out. Please edit the AAR manually and try again next week!")
  		}
  	})
  }
});


// GOOGLE STUFF

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/script.projects',
'https://www.googleapis.com/auth/drive',
'https://www.googleapis.com/auth/documents'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
function callAppScriptFunction(functionName, args){
	fs.readFile('credentials.json', (err, content) => {
	  if (err) return console.log('Error loading client secret file:', err);
	  // Authorize a client with credentials, then call the Google Apps Script API.
	  authorize(JSON.parse(content), callAppsScript, functionName, args);
	});
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, functionName, args) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, functionName, args);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Call an Apps Script function to list the folders in the user's root
 * Drive folder.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function callAppsScript(auth, functionName, args) { // eslint-disable-line no-unused-vars
  const scriptId = '1zid_zt-U97oLtaIAisRy9cdKj_Zs9A9y67OAcBmXxIa2nnG67Y8N9mgQ';
  const script = google.script('v1');

  // Make the API request. The request object is included here as 'resource'.
  script.scripts.run({
    auth: auth,
    resource: {
      function: functionName,
      parameters: args
    },
    scriptId: scriptId,
  }, function(err, resp) {
    if (err) {
      // The API encountered a problem before the script started executing.
      console.log('The API returned an error: ' + err);
      return;
    }
    if (resp.error) {
      // The API executed, but the script returned an error.

      // Extract the first (and only) set of error details. The values of this
      // object are the script's 'errorMessage' and 'errorType', and an array
      // of stack trace elements.
      const error = resp.error.details[0];
      console.log('Script error message: ' + error.errorMessage);
      console.log('Script error stacktrace:');

      if (error.scriptStackTraceElements) {
        // There may not be a stacktrace if the script didn't start executing.
        for (let i = 0; i < error.scriptStackTraceElements.length; i++) {
          const trace = error.scriptStackTraceElements[i];
          console.log('\t%s: %s', trace.function, trace.lineNumber);
        }
      }
    } else {
      console.log(resp.data.done);
    }
  });
}


