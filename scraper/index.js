const axios = require('axios')
var currentitemchecks = 0
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const  mysql = require('mysql');
const IsAPrice = new RegExp('^~')
const fractionFormatTest = /\s\d*\/\d*\s/
const con = mysql.createConnection({
  host: "104.199.107.101",
  user: "Scraper",
  password: "QLHYnN9X3wMvc5t",
  database : 'path_tool_database',
});
con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});
con.query("SELECT LastId FROM lastId", function (err, result,) 
{
  if(err) throw err;
  JSON.stringify(result[0])
  scrape(result[0].LastId)
});
function scrape(nextId){
  console.log("checking next id:"+nextId)
  axios.get('http://www.pathofexile.com/api/public-stash-tabs?id='+nextId)
  .then(function (response) {
    for (var i = 0; i < response.data.stashes.length; i++) {
        const stash = response.data.stashes[i];
        con.query("DELETE FROM CurrencyItems WHERE StashId  = '"+stash.id+"'", function (err, result) {
          if (err) throw err;
          if(result.affectedRows>0)
          {
          console.log("Deleted "+result.affectedRows)
          }
        });
        for (var y = 0; y < stash.items.length; y++) {
            const item = stash.items[y];
            if(item.frameType == 5){
                if(IsAPrice.test(item.note)){
                  var price
                  const splitNote = (item.note).split(' ')
                  if(fractionFormatTest.test(item.note)){
                    const splitPrice = splitNote[1].split('/')
                    price = splitPrice[0]/splitPrice[1]
                  }
                  else
                  {
                    price = splitNote[1]/item.stackSize
                  }
                  sqlInsertCurrencyItem(item.league,item.typeLine,stash.id,item.id,price,splitNote[2])
                }
            }   
          }          
      }
      sleep(250).then(() => saveLastIdAndScrape(nextId,response.data.next_change_id))
  })
  .catch(function (error) {
    console.log("something went wrong "+ error)
    sleep(1000).then(() => scrape(nextId))
  })
}
function saveLastIdAndScrape(lastId,nextId)
{
  con.query("UPDATE lastId SET LastId = '"+lastId+"' WHERE Id = '1'", function (err, result) {
    if (err) throw err;
  });
  testifshouldwait(nextId)
}
function testifshouldwait (nextId)
{
  if(currentitemchecks>10)
  {
  waitonitemchecks(nextId)
  }
  else
  {
    scrape(nextId)
  }
}
function waitonitemchecks(nextId)
{
  if(currentitemchecks>0)
  {
    sleep(10000).then(() => waitonitemchecks(nextId))
    console.log(currentitemchecks)
  }
  else
  {
    scrape(nextId)
  }
}
function sqlInsertCurrencyItem (League,item,stash,itemId,priceForOne,listedFor){
  if((listedFor!==undefined)&(League!==undefined))
  {
  currentitemchecks++
  console.log(currentitemchecks)
  item = item.replace("'","''")
  listedFor = listedFor.replace("'","''")
  con.query("SELECT LeagueId FROM LeagueIds WHERE LeagueName ='"+League+"'", function (err, result,) 
  {
    if(err)
    {
      throw err;
    }
    else if(result[0]==undefined){
      con.query("INSERT INTO LeagueIds (LeagueName) VALUES ('"+League+"')", function (err, result,) 
      {
        if(err) throw err;
        console.log("league added")
        sqlInsertCurrencyItem(League,item,stash,itemId,priceForOne,listedFor)
        currentitemchecks=currentitemchecks-1
      });
    }
    else
    { 
      JSON.stringify(result[0])
      const LeagueId = result[0].LeagueId
      con.query("SELECT RelatesTo FROM CurrencyIds WHERE TextName='"+item+"'", function (err, result) {
        if (err) throw err;
        if(result[0]!==undefined)
        {
          JSON.stringify(result[0])
          const CurrencyId = result[0].RelatesTo
          con.query("SELECT RelatesTo FROM CurrencyIds WHERE TextName='"+listedFor+"'", function (err, result) {
            if (err) throw err;
            if(result[0]!==undefined)
            {
              JSON.stringify(result[0])
              const ListedForId = result[0].RelatesTo
              con.query("INSERT INTO CurrencyItems (ItemId,StashId,CurrencyId,LeagueId,Price,ListedForId) VALUES ('"+itemId+"','"+stash+"','"+CurrencyId+"','"+LeagueId+"','"+priceForOne+"','"+ListedForId+"')", function (err, result,) 
              {
                if(err) throw err
                console.log("Added:"+item+"\n listed for:"+listedFor+"\n in league:"+League+"\n price:"+priceForOne)
                currentitemchecks=currentitemchecks-1
              });
            }
            else
            {
              console.log("failed to find end currnecy in id table:"+item+"\n listed for:"+listedFor+"\n in league:"+League+"\n price:"+priceForOne)
              currentitemchecks=currentitemchecks-1
            }
          });
        }
        else
        {
          console.log("failed to find start currency in id table:"+item+"\n listed for:"+listedFor+"\n in league:"+League+"\n price:"+priceForOne)
          currentitemchecks=currentitemchecks-1
        }
      });
    } 
  });
}
}
