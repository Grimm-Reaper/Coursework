const axios = require('axios')
const  mysql = require('mysql');
let currentLeagueTests = 0 //the current number of leagues that are being tested
let currentItemInserts = 0 //the current number of items that are being inserted
const maxLeagueChecks = 10 //the maximum items that can be tested at once
const maxItemInserts = 20 //the maximum number of item inserts that can occur at once
const sleeptimeWhileWaiting = 10000 //how long the program waits before checking how many item checks are happening if the max number of checks is exceeded
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));//a promise to wait for after the timeout has passed before calling the next function
const isAPrice = /^~/ //used to check if an items note when scraped off of the api is in the format that is used for prices
const fractionFormatTest = /\s\d*\/\d*\s/ //used for testing if a price listed as a fraction
const nonEnglishOnlynote = /[^\ -~]/g//used to detect nonn english characters
const leagueTest = /\(PL\d+\)/ //used to check if it is in a custom league as I don't careabout data that is due to the small economies in them
const con = mysql.createConnection({
  host: "104.199.107.101",
  user: "Scraper",
  password: "QLHYnN9X3wMvc5t",
  database : 'poe_tools_db',
});
con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});
statup()
function statup(){
  con.query("SELECT id FROM lastId WHERE pkey = '1'", function (err, result,) 
  {
  if(err) throw err;
  JSON.stringify(result[0])
  console.log("found statpoint "+result[0].id +" from the database") 
  getApiData(result[0].id)
  });
}

function getApiData(nextChangeId)
{
  console.log("Getting data from api for:"+nextChangeId)
  axios.get('http://www.pathofexile.com/api/public-stash-tabs?id='+nextChangeId)
  .then(function (response) {
    response.data.stashes.forEach(stash => {
      stash.items.forEach(item => {
        testItem(item)
      });
    });
    con.query("UPDATE lastId SET id = '"+nextChangeId+"' WHERE pkey = '1'", function (err, result) {
      if (err) throw err;
    });
    sleep(250).then(() => testBacklog(response.data.next_change_id))
  }).catch(function (error) 
  {
    console.log("there was an error scraping the api:"+error)
    sleep(1000).then(() => getApiData(nextChangeId))
  })
}
function testItem(targetItem){
  if(targetItem.frameType==5)
  {
    if(isAPrice.test(targetItem.note))
    {
      if(!(nonEnglishOnlynote.test(targetItem.note)))
      {
        if(!(leagueTest.test(targetItem.league)))
        {
          let price = 0
          let noteSplitSpaces = (targetItem.note).split(" ")
          if(fractionFormatTest.test(targetItem.note))
          {
            let priceParts = noteSplitSpaces[1].split("/")
            price = priceParts[0]/priceParts[1]
          }
          else
          {
            price = noteSplitSpaces[1]/targetItem.stackSize
          } 
          insertItemIntoDb(targetItem.league,targetItem.typeLine.replace(/'/g,"''"),noteSplitSpaces[2].replace(/'/g,"''"),price)
        }
      }
    }
  }
}
function insertItemIntoDb(league,startItem,targetItem,price)
{
  currentLeagueTests++
  con.query("SELECT leagueId FROM leagueIds WHERE LeagueName ='"+league+"'", function (err, result,) 
  {
    if(err) throw err;
    currentLeagueTests=currentLeagueTests-1
    JSON.stringify(result)
    let leagueId = result[0].leagueId
    if(leagueId!=undefined)
    {
      currentItemInserts++
      con.query("SELECT currencyIdRelatesTo FROM  currencyIds WHERE currencyTextName ='"+startItem+"'", function (err, result,) 
      {
        if(err) throw err;
        if(result[0]==undefined)
        {
          currentItemInserts = currentItemInserts -1
          console.log("failed to find start currnecy in id table:\n startCurrnecy:"+startItem+"\n targetCurrency:"+targetItem+"\n in league:"+league+"\n price:"+price)
        }
        else
        {
          let startItemId = result[0].currencyIdRelatesTo
          con.query("SELECT currencyIdRelatesTo FROM  currencyIds WHERE currencyTextName ='"+targetItem+"'", function (err, result,) 
          {
            if(err) throw err;
            if(result[0]==undefined)
            {
              currentItemInserts = currentItemInserts -1
              console.log("failed to find start currnecy in id table:\n startCurrnecy:"+targetItem+"\n targetCurrency:"+targetItem+"\n in league:"+league+"\n price:"+price)
            }
            else
            {
              let targetItemId = result[0].currencyIdRelatesTo
              let DateTime = new Date(Date.now())
              DateTime = DateTime.toISOString().replace("T"," ").replace("Z","")
              con.query("INSERT INTO marketItems (time, price, startingCurrency, endCurrency, leagueId) VALUES ('"+DateTime+"','"+price+"','"+startItemId+"','"+targetItemId+"','"+leagueId+"')", function (err, result,) 
              {
                if (err) throw err
                console.log("inserted item into table:\n startCurrnecy:"+startItem+"\n targetCurrency:"+targetItem+"\n in league:"+league+"\n price:"+price)

                currentItemInserts=currentItemInserts-1
              });
            } 
         })
        }     
      })
    }
  })
}
function testBacklog (nextId)
{
  if((currentItemInserts>maxItemInserts)|(currentLeagueTests>maxLeagueChecks))
  {
  waitForBacklog(nextId)
  }
  else
  {
    getApiData(nextId)
  }
}
function waitForBacklog(nextId)
{
  if(currentLeagueTests>0)
  {
    sleep(sleeptimeWhileWaiting).then(() => waitForBacklog(nextId))
    console.log("The maximum number of current league checks has been exceeded current total:"+currentLeagueTests)
  }
  else if(currentItemInserts>0){
    sleep(sleeptimeWhileWaiting).then(() => waitForBacklog(nextId))
    console.log("The maximum number of current item inserts has been exceeded current total:"+currentItemInserts)
  }
  else
  {
    getApiData(nextId)
  }
}