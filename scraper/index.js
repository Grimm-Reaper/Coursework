const axios = require('axios')
var currentitemchecks = 0
const maxItemChecks = 10
const sleeptimeWhileWaiting = 10000
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
  console.log(result[0].LastId) 
  scrape(result[0].LastId)

});
function scrape(nextId){
  //nextId = "147438564-153179573-145235954-165110211-154953093"
  //an id with some items in for testing
  console.log("checking next id:"+nextId)
  axios.get('http://www.pathofexile.com/api/public-stash-tabs?id='+nextId)
  .then(function (response) {
    for (var i = 0; i < response.data.stashes.length; i++) {
      const stash = response.data.stashes[i];
      var foundListing = false
      for (var y = 0; y < stash.items.length; y++) 
      {
        const item = stash.items[y];
        if(item.frameType == 5)
        {
          if(IsAPrice.test(item.note))
          {
            var price
            const splitNote = (item.note).split(' ')
            if(fractionFormatTest.test(item.note))
            {
              const splitPrice = splitNote[1].split('/')
              price = splitPrice[0]/splitPrice[1]
            }
            else
            {
              price = splitNote[1]/item.stackSize
            }
            con.query("DELETE FROM CurrencyItems WHERE StashId  = '"+stash.id+"'", function (err, result) 
            {
              if (err) throw err;
              if(result.affectedRows>0)
              {
                console.log("Deleted "+result.affectedRows)
              }
              testLeague(item.league,item.typeLine,stash.id,item.id,price,splitNote[2])
            });

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
  if(currentitemchecks>maxItemChecks)
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
    sleep(sleeptimeWhileWaiting).then(() => waitonitemchecks(nextId))
    console.log("The maximum number of item checks has been exceeded current total:"+currentitemchecks)
  }
  else
  {
    scrape(nextId)
  }
}
function testLeague (League,item,stash,itemId,priceForOne,listedFor)
{
  if((listedFor!==undefined)&(League!==undefined)&(priceForOne>0))
  {
    if(!/\(PL\d+\)/.test(League))
    {
    currentitemchecks++
    console.log("Item added to queue \n current queue:"+currentitemchecks+"\n start currnecy"+":"+item+"\n listed for:"+listedFor+"\n in league:"+League+"\n price:"+priceForOne)
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
          testLeague(League,item,stash,itemId,priceForOne,listedFor)
          currentitemchecks=currentitemchecks-1
        });
      }
      else
      { 
        console.log("league found "+result[0].LeagueId)
        JSON.stringify(result[0])
        const LeagueId = result[0].LeagueId
        addItem (LeagueId,item,stash,itemId,priceForOne,listedFor)
      } 
    });
    }
  }
}
function addItem (LeagueId,item,stash,itemId,priceForOne,listedFor)
{
  console.log("item recieved in add function")
  con.query("SELECT RelatesTo FROM CurrencyIds WHERE TextName='"+item+"'", function (err, result) {
    if (err) throw err;
    if(result[0]!==undefined)
    {
      JSON.stringify(result[0])
      const CurrencyId = result[0].RelatesTo
      console.log("Start Currency found for item \n "+"start currnecy"+":"+item+"-->"+CurrencyId+"\n listed for:"+listedFor+"\n in league:"+LeagueId+"\n price:"+priceForOne)
      con.query("SELECT RelatesTo FROM CurrencyIds WHERE TextName='"+listedFor+"'", function (err, result) {
        if (err) throw err;
        if(result[0]!==undefined)
        {
          JSON.stringify(result[0])
          const ListedForId = result[0].RelatesTo
          console.log("End Currency found for item \n "+"start currnecy"+":"+item+"-->"+CurrencyId+"\n listed for:"+listedFor+"-->"+ListedForId+"\n in league:"+LeagueId+"\n price:"+priceForOne)

          con.query("INSERT INTO CurrencyItems (ItemId,StashId,CurrencyId,LeagueId,Price,ListedForId) VALUES ('"+itemId+"','"+stash+"','"+CurrencyId+"','"+LeagueId+"','"+priceForOne+"','"+ListedForId+"')", function (err, result,) 
          {
            console.log("Added:"+item+"\n listed for:"+listedFor+"\n in league:"+LeagueId+"\n price:"+priceForOne)
            currentitemchecks=currentitemchecks-1
          });
        }
        else
        {
          console.log("failed to find end currnecy in id table:"+item+"\n listed for:"+listedFor+"\n in league:"+LeagueId+"\n price:"+priceForOne)
          currentitemchecks=currentitemchecks-1
        }
      });
    }
    else
    {
      console.log("failed to find start currency in id table:"+item+"\n listed for:"+listedFor+"\n in league:"+LeagueId+"\n price:"+priceForOne)
      currentitemchecks=currentitemchecks-1
    }
  });
}
