var webhooks = {
  "mustache_men": "https://discordapp.com/api/webhooks/668998095190622209/GZorkIsxfPoFnUqAKpqIyGjyULgZWdELN1X0_d_k9sHH9HU2bt_uUwQGeteZOqcXLxVl"
};

var discordUserMap = {
  "Wu": "303258465969766400",
  "Gerow": "620317468493217811",
  "Andrews": "619597742968143875",
  "DuRoss": "620418124826804257",
  "White": "620007911543930940",
  "Wang": "620436077509083186",
  "Catana": "620439678474256385",
  "Notice": "620435878032179200",
  "Alvarez": "493474213726912532",
  "Friend": "620007064055447552",
  "Duran": "620434876331458560",
  "Greene": "619644141789511741",
  "MacKenzie": "619553613873807384",
  "Bato": "620060152149835776",
  "Evans": "620316205223510030",
  "Rosero": "620445693022306315",
  "McCormack": "619641878475833386",
  "Ahmed": "619606033999855616",
  "Rosebery": "497092454143492097",
  "Rathjen": "380120256334790668",
  "Jones": "458868654008958976",
  "Kim": "619961109365129226",
  "Schmitt": "619592645890801664",
  "Schoeberlein": "619901285113659396",
  "Serrano": "619701828942299136",
  "Fischer": "620043784339849217",
  "LaRoche-Victor": "619355485073702925",
  "Glynn": "472525695709478912",
  "Colaizzo": "619952296989687819"
}

function sendMessage(message, channel)
{
  Logger.log(message);
  if(webhooks.hasOwnProperty(channel))
    var url = webhooks[channel];
  else {
    Logger.log("Error Sending Message to Channel " + channel);
    return "NoStoredWebhookException";
  }
  
  var payload = JSON.stringify({content: message});
  
  var params = {
    headers: {"Content-Type": "application/json"},
    method: "POST",
    payload: payload,
    muteHttpExceptions: true
  };
  
  var res = UrlFetchApp.fetch(url, params);
  Logger.log(res.getContentText());
}

function getDiscordMention(lastName) {
  if (discordUserMap.hasOwnProperty(lastName)) 
    return "<@" + discordUserMap[lastName] + ">";
  Logger.log("Trying to message cadet " + lastName + " not in user id map.");
  return null;
}

function sendDiscordMessages(pocMissList){
  let message = "The following cadets have made the PFO angry by not filling their trackers: ";
  for (let i = 0 ; i < pocMissList.length; i++){
    message += getDiscordMention(pocMissList[i].name);
    if (i < pocMissList.length - 1){
      message += ", ";
    }
  }
  sendMessage(message, "mustache_men");
}


function sendIndividualEmail(miss) {
 
  Logger.log(miss.email);
  
  let body = "C/" + miss.name + ",<br><br>";
  body += "You have missed the deadline to fill the following poll: ";
  body += "<a href='" + miss.poll.getPublishedUrl() + "'>" + miss.poll.getTitle() + "</a><br><br>";
  body += "This poll was due " + miss.daysOld + " days ago. ";
  if (miss.flight === "POC") {
    body += "Being a POC cadet does not exempt you from filling this poll. You will be notified each day until it is complete.<br>";
  }
  else {
    body += "The commander of " + miss.flight + " flight has been notified. You and your flight commander will be notified each day until it is complete.<br>";
  }
  body += "<br>If you believe you have received this email in error, please notify me. Thank you for your time and consideration<br><br>";
  body += "Very Respectfully,<br><br>";
  body += "JOSEPH H. COLAIZZO, C/Capt, AFROTC<br>";
  body += "Physical Fitness Officer, Detachment 560<br>";
  body += "jcolaizzo01@manhattan.edu<br>";
  body += "845-901-7624";
  
  GmailApp.sendEmail(miss.email, miss.poll.getTitle() + " Deadline Missed", "", {
    htmlBody: body,
    name: "PFO Deadline Miss Bot",
    bcc: "jcolaizzo01@manhattan.edu"
  });
}


function sendFlightCommanderEmail(missList, commanderEmail, commanderName, flightName) {
 
  if (missList.length == 0) {
    return;
  }
  let body = "C/Capt " + commanderName + ",<br><br>";
  body += "The following cadets in your flight have not filled recently past due polls:<br><br>";
  for (let i = 0 ; i < missList.length ; i++) {
    let miss = missList[i];
    body += "- C/" + miss.name + " has missed the deadline for ";
    body += "<a href='" + miss.poll.getPublishedUrl() + "'>" + miss.poll.getTitle() + "</a>";
    body += " which was due " + miss.daysOld + " days ago.<br>";
  }
  body += "</ul><br><br> Thank you for your time and consideration.<br><br>";
  body += "Very Respectfully,<br><br>";
  body += "JOSEPH H. COLAIZZO, C/Capt, AFROTC<br>";
  body += "Physical Fitness Officer, Detachment 560<br>";
  body += "jcolaizzo01@manhattan.edu<br>";
  body += "845-901-7624";
  
  GmailApp.sendEmail(commanderEmail, flightName + " Deadline Misses", "", {
    htmlBody: body,
    name: "PFO Deadline Miss Bot",
    bcc: "jcolaizzo01@manhattan.edu"
  });
}


// Spreadsheets and data
var completionSheet = SpreadsheetApp.openById("1XWr27KU2UQ166XtTR0uxi32WGSIUmI1N4uS2j0jyqQ4").getSheets()[0];
var outstandingPollsSheet = SpreadsheetApp.openById("1LCeg1XGM-7ZpCeGftHZg-6ZPKIS_hmPVhhV0PZsRwPE").getSheets()[0];
var pollData = outstandingPollsSheet.getRange("A2:E30");
var polls = pollData.getValues();
var completionData = completionSheet.getRange("A2:D79");
var roster = completionData.getValues();


function getNonResponders() {
  
  let misses = {
    alpha: [],
    bravo: [],
    charlie: [],
    delta: [],
    poc: []
  }
  
  for (let i = 0 ; i < polls.length ; i++) {
   
    let pollURL = polls[i][1];
    if (!pollURL) {
      break;
    }

    let poll = FormApp.openByUrl(pollURL);
    let deadline = polls[i][3];
    
    // Do nothing for this poll if before deadline
    let today = new Date();
    if (today < deadline) {
      continue;
    }
    
    let targetAudience = polls[i][2];
    let daysSinceDeadline = Math.ceil((today - deadline) / 24 / 60 / 60 / 1000);
    populateMissesForPoll(misses, poll, daysSinceDeadline, targetAudience);
  }
  Logger.log("****MISSES****" + misses);
  return misses;
}
  

function populateMissesForPoll(misses, poll, daysSinceDeadline, targetAudience){
  
  let pollResponses = poll.getResponses();
  let collectedEmails = [];
  for (let j = 0 ; j < pollResponses.length ; j++) {
    collectedEmails.push(pollResponses[j].getRespondentEmail());
  }
 
  for (let j = 0 ; j < roster.length ; j++) {
    let email = roster[j][0];
    let lastName = roster[j][1];
    let flight = roster[j][2];
    let exempt = roster[j][3];
    let numMisses = roster[j][4];
    
    let required = (targetAudience != "PT Tracker" || exempt != 1);
    if (required && !collectedEmails.includes(email)) {
      
      let deadlineMiss = {
        "name": lastName,
        "email": email,
        "flight": flight,
        "poll": poll,
        "daysOld": daysSinceDeadline
      };
      
      misses[flight.toLowerCase()].push(deadlineMiss);
    }
  }   
}