const axios = require('axios')//used for the axios code libary to simplify making http requests
const mysql = require('mysql');//used for the mysql code libary to allow for sql querries to be made
let currentLeagueTests = 0 //the current number of leagues that are being tested
let currentItemInserts = 0 //the current number of items that are being inserted
const maxLeagueChecks = 100 //the maximum items that can be tested at once
const maxItemInserts = 100 //the maximum number of item inserts that can occur at once
const sleeptimeWhileWaiting = 666 //how long the program waits before checking how many item checks are happening if the max number of checks is exceeded
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));//a promise to wait for after the timeout has passed before calling the next function
const isAPrice = /^~/ //used to check if an items note when scraped off of the api is in the format that is used for prices
const fractionFormatTest = /\s\d*\/\d*\s/ //used for testing if a price listed as a fraction
const nonEnglishOnlynote = /[^\ -~]/g//used to detect nonn english characters
const leagueTest = /\(PL\d+\)/ //used to check if it is in a custom league as I don't careabout data that is due to the small economies in them
const con = mysql.createConnection({
  host: "104.199.107.101",
  user: "Scraper",
  password: "QLHYnN9X3wMvc5t",
  database: 'poe_tools_db',
});//the database connection
con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});//connecting to the database
statup()//calling the start function
function statup()//start function uses an sql querry to find where the program left of and the calls the function getApiData with the last changeId the program checked
{
  con.query("SELECT id FROM lastId WHERE pkey = '1'", function (err, result, ) {
    if (err) throw err;
    JSON.stringify(result[0])
    console.log("found statpoint " + result[0].id + " from the database")
    getApiData(result[0].id)
  });
}

function getApiData(nextChangeId, ) {
  console.log("Getting data from api for:" + nextChangeId)
  axios.get('http://www.pathofexile.com/api/public-stash-tabs?id=' + nextChangeId)
    .then(function (response) {
      response.data.stashes.forEach(stash => {//a foreach loop that go though each stash in the api's response
        stash.items.forEach(item => {//a foreach loop that loops though each item in the stash
          testItem(item)
        });
      });
      con.query("UPDATE lastId SET id = '" + nextChangeId + "' WHERE pkey = '1'", function (err, result) {
        if (err) throw err;//this querry updates the start point for the program in the database so that is the program is restarted it starts in the same place
      });
      sleep(25).then(() => testBacklog(response.data.next_change_id))//waits a small amount of time before callingiself to make the next request otherwise the api locks my program out
    }).catch(function (error) {
      console.log("there was an error scraping the api:" + error)
      sleep(1000).then(() => getApiData(nextChangeId))//waits longer before recalling the getApiData function with the same id because there was and error and it is likely that the progam was calling to often
    })
}
function testItem(targetItem) {//this function test wether the item that is sent into it is an item that the program is inserested in ie a currency item
  if (targetItem.frameType == 5) {
    if (isAPrice.test(targetItem.note))//tests wether the item has a price attached to in the notes section using regex
    {
      if (!(nonEnglishOnlynote.test(targetItem.note)))//tests all the charaters in the are english using regex
      {
        if (!(leagueTest.test(targetItem.league)))//tests the item is in a main league or a private one using regex
        {
          let price = 0
          let noteSplitSpaces = (targetItem.note).split(" ")
          if (noteSplitSpaces.length == 3) {
            if (fractionFormatTest.test(targetItem.note))// tests if the price in the notes field is in the form of a fraction and then deals with it correctly
            {
              let priceParts = noteSplitSpaces[1].split("/")
              price = priceParts[0] / priceParts[1]
            }
            else {
              price = noteSplitSpaces[1] / targetItem.stackSize//if the price is not as a fraction divides the number by the stacksize
            }
            insertItemIntoDb(targetItem.league, targetItem.typeLine.replace(/'/g, "''"), noteSplitSpaces[2].replace(/'/g, "''"), price)//feeds parameters into inserts items function but replaces any ' with '' to escape them in the sql later
          }
        }
      }
    }
  }
}
function insertItemIntoDb(league, startItem, targetItem, price) {
  currentLeagueTests++//increases the current league tests global varible
  con.query("SELECT leagueId FROM leagueIds WHERE LeagueName ='" + league + "'", function (err, result, ) //sends an sql querry with the text name of the league to get the id
  {
    if (err) throw err;
    currentLeagueTests = currentLeagueTests - 1//once the querry is complete the current league tests global is reduced again
    JSON.stringify(result)
    if (result[0] != undefined)//check result[0] is set to a value rather than left undefined
    {
      let leagueId = result[0].leagueId//sets league id equal to the result of the sql request
      currentItemInserts++//increases the current item inserts
      con.query("SELECT currencyIdRelatesTo FROM  currencyIds WHERE currencyTextName ='" + startItem + "'", function (err, result, ) {
        if (err) throw err;
        if (result[0] == undefined)//if this if is triggered that means the currency is not in the currency id database and therefore this item has failed the test
        {
          currentItemInserts = currentItemInserts - 1//as the item had no currency id associated with it the insert chain is broken and therefoe currentiteminserts need to be reduced by 1
          console.log("failed to find start currnecy in id table:\n startCurrnecy:" + startItem + "\n targetCurrency:" + targetItem + "\n in league:" + league + "\n price:" + price)
        }
        else {
          let startItemId = result[0].currencyIdRelatesTo
          con.query("SELECT currencyIdRelatesTo FROM  currencyIds WHERE currencyTextName ='" + targetItem + "'", function (err, result, ) {
            if (err) throw err;
            if (result[0] == undefined)//if this if is trigger the target item had no currency id to match it and therefore the item is not inserted
            {
              currentItemInserts = currentItemInserts - 1//as the item had no currency id associated with it the insert chain is broken and therefoe currentiteminserts need to be reduced by 1
              console.log("failed to find start currnecy in id table:\n startCurrnecy:" + targetItem + "\n targetCurrency:" + targetItem + "\n in league:" + league + "\n price:" + price)
            }
            else {
              let targetItemId = result[0].currencyIdRelatesTo
              let DateTime = new Date(Date.now())//gets the current time
              DateTime = DateTime.toISOString().replace("T", " ").replace("Z", "")//takes the currency iso format time and makes it match the time format sql uses
              con.query("INSERT INTO marketItems (time, price, startingCurrency, endCurrency, leagueId) VALUES ('" + DateTime + "','" + price + "','" + startItemId + "','" + targetItemId + "','" + leagueId + "')", function (err, result, ) {
                if (err == "Error: WARN_DATA_TRUNCATED: Data truncated for column 'price' at row 1") //this error means that data was traunicated and can be ignored as it is expected
                {
                  console.log("data traunicated")
                }
                else if (err) throw err
                console.log("inserted item into table:\n startCurrnecy:" + startItem + "\n targetCurrency:" + targetItem + "\n in league:" + league + "\n price:" + price)

                currentItemInserts = currentItemInserts - 1//if an item reaches this stage it has been succsesfully added to the database and therefore the current item inserts can be reduced
              });
            }
          })
        }
      })
    }
  })
}
function testBacklog(nextId) {
  if ((currentItemInserts > maxItemInserts) | (currentLeagueTests > maxLeagueChecks))//checks if either the max item check or the max league checks have been exceeded (both of these are defined in the constants at the start of the code)
  {
    waitForBacklog(nextId)//if the limits have been exceeded the function wait for backlog is called
  }
  else {
    getApiData(nextId)//if the limits have not been exceeded the function wait for backlog is not called and getapidata is called with the next change id to be checked
  }
}
function waitForBacklog(nextId)//waits until both the current league and item tests are 0 the prodceeds gathering data
{
  if (currentLeagueTests > 0) {
    sleep(sleeptimeWhileWaiting).then(() => waitForBacklog(nextId))
    console.log("The maximum number of current league checks has been exceeded current total:" + currentLeagueTests)
  }
  else if (currentItemInserts > 0) {
    sleep(sleeptimeWhileWaiting).then(() => waitForBacklog(nextId))
    console.log("The maximum number of current item inserts has been exceeded current total:" + currentItemInserts)
  }
  else {
    getApiData(nextId)//if the backlog is cleared this function calls getApiData so the program can continue
  }
}