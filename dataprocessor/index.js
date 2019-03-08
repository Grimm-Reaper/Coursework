const intervalBetweenCollections = 21600000
const  mysql = require('mysql');
const con = mysql.createConnection({
    host: "104.199.107.101",
    user: "DataProccesor",
    password: "sKeYXfn3ra8HBDQ",
    database : 'path_tool_database',
  });
setInterval(processdata,intervalBetweenCollections)
function LeagueCleanup ()
{
//get all leagues in and array
con.query("SELECT LeagueId, LeagueName FROM LeagueIds WHERE Depricated = false ORDER BY LeagueId ASC", function (err, result,) 
{
  if(err) throw err;
  JSON.stringify(result)
  result.forEach(leagueOne => {
    let leagueOneName = leagueOne.LeagueName
    result.forEach(leagueTwo => {
        let leagueTwoName = leagueTwo.LeagueName
        if((leagueOneName == leagueTwoName)&(leagueOne.LeagueId!=leagueTwo.LeagueId))
        {
            console.log("Match found\n "+leagueOneName+":"+leagueOne.LeagueId+" - "+leagueTwoName+":"+leagueTwo.LeagueId )
        }
    });
  });
});
}
//check for duplicates

//remove the duplicate league from the ids table
processdata()
function processdata(){
  console.log("dataProcessing has begun")
  con.query("SELECT LeagueId,LeagueName FROM LeagueIds WHERE Depricated = false ", function (err, result,) 
  {
    if(err) throw err;
    JSON.stringify(result)
    result.forEach(League => {
        const LeagueId = League.LeagueId
        const LeagueName = League.LeagueName
        con.query("SELECT * FROM CurrencyItems WHERE LeagueId ='"+LeagueId+"' ORDER BY Price ASC LIMIT 1", function (err, result,) 
        {
          if(err) throw err;
          if(result==undefined)
          {
            con.query("UPDATE LeagueIds SET Depricated = true' WHERE LeagueId = '"+LeagueId+"'", function (err, result,) 
            {
              if(err) throw err;
            });
          }
          else
          {
            console.log("Processing data for league:"+LeagueName)
            con.query("SELECT RelatesTo,TextName FROM CurrencyIds WHERE RelatesTo = CurrencyId", function (err, result,) 
            {
              if(err) throw err;
              JSON.stringify(result)
              result.forEach(StartCurrency => {
                  const StartCurrencyId = StartCurrency.RelatesTo
                  const StartCurrencyName = StartCurrency.TextName
                  result.forEach(EndCurrency => {
                    const EndCurrencyId = EndCurrency.RelatesTo
                    const EndCurrencyName = EndCurrency.TextName
                    console.log("Processing data in League:"+LeagueName+"\n For currency:"+StartCurrencyName+"--->"+EndCurrencyName)
                    const WhereLeagueStartEnd = "LeagueId = '"+LeagueId+"'AND CurrencyId ='"+StartCurrencyId+"'AND ListedForId='"+EndCurrencyId+"'"
                    con.query("SELECT Price FROM CurrencyItems WHERE "+WhereLeagueStartEnd+"ORDER BY Price ASC", function (err, result,) 
                    {
                      if(err) throw err;
                      JSON.stringify(result)
                      const length = result.length
                      if(length>0)
                      {
                          //resultsFound = true
                          let median
                          let medianrank
                          let FirstQuartile
                          let ThirdQuartile
                          if(length%2==1)
                          {
                              median = result[((length+1)/2)-1].Price
                              medianrank = (length+1)/2
                          }
                          else if(length%2==0)
                          {
                              median = result[(length/2)-1].Price
                              medianrank = length/2
                          }
                          if(medianrank%2==1)
                          {
                              FirstQuartile = result[((medianrank+1)/2)-1].Price
                          }
                          else if(medianrank%2==0)
                          {
                              FirstQuartile = result[(medianrank/2)-1].Price
                          }
                          if(medianrank%2==1)
                          {
                              ThirdQuartile = result[medianrank+(((medianrank+1)/2))-2].Price
    
                          }
                          else if(medianrank%2==0)
                          {
                              ThirdQuartile = result[medianrank+((medianrank/2))-2].Price
                          }
                          let iqr = ThirdQuartile - FirstQuartile
                          let lowerFrence = FirstQuartile - 1.5*iqr
                          let upperFrence = ThirdQuartile + 1.5*iqr
                          con.query("SELECT Price FROM CurrencyItems WHERE CurrencyId = '"+StartCurrencyId+"'AND LeagueId = '"+LeagueId+"'AND ListedForId = '"+EndCurrencyId+"' AND Price BETWEEN '"+lowerFrence+"' AND'"+upperFrence+ "' ORDER BY Price ASC", function (err, result,) 
                          {
                            if(err) throw err;
                            JSON.stringify(result)
                            if(result.length>0)
                            {
                            let min = result[0].Price
                            let max = result[result.length-1].Price
                            let runningTotal = 0
                            let SampleSize = result.length
                            result.forEach(current => {
                               runningTotal = runningTotal + current.Price
                            });
                            let mean = runningTotal/result.length
                            runningTotal = 0
                            result.forEach(present => {
                                runningTotal = runningTotal + (present.Price-mean)*(present.Price-mean)
                             });
                            let standardDeviation = runningTotal/result.length
                            let lastSeen
                            let count=0
                            let lastMaxCount=0
                            let mode
                            result.forEach(present => {
                                if(present.Price == lastSeen)
                                {
                                    count++
                                    if(count>lastMaxCount)
                                    {
                                        lastMaxCount = count
                                        mode = present.Price
                                    }
                                }
                                else
                                {
                                    count = 0
                                }
                                lastSeen = present.Price
                             });
                             con.query("SELECT Price FROM CurrencyItems WHERE CurrencyId = '"+StartCurrencyId+"'AND LeagueId = '"+LeagueId+"'AND ListedForId = '"+EndCurrencyId+"' AND Price >= '"+lowerFrence+"' ORDER BY Price ASC LIMIT 30", function (err, result,) 
                             {
                                if(err) throw err;
                                JSON.stringify(result)
                                result.forEach(current => {
                                    runningTotal = runningTotal + current.Price
                                 });
                                 let conversionRate = runningTotal/result.length
                                 let DateTime = new Date(Date.now())
                                 DateTime = DateTime.toISOString().replace("T"," ").replace("Z","")
                                 con.query("INSERT INTO CurrencyMetadata (StartCurrencyId,EndCurrencyId,LeagueId,SampleAt,FirstQuartile,Median,ThirdQuartile,Min,Max,Mean,Mode,StandardDeviation,ConversionRate, SampleSize) VALUES ('"+StartCurrencyId+"','"+EndCurrencyId+"','"+LeagueId+"','"+DateTime+"','"+FirstQuartile+"','"+median+"','"+ThirdQuartile+"','"+min+"','"+max+"','"+mean+"','"+mode+"','"+standardDeviation+"','"+conversionRate+"','"+SampleSize+"')" , function (err, result,) 
                                 {
                                     if(err){
                                        JSON.stringify(err)
                                        if(err.errno==1265)//ignoring this error as it is expected and does not impact the functionality of the program
                                        {
                                            console.log("Metadata added in League:"+LeagueName+"\n For currency:"+StartCurrencyName+"--->"+EndCurrencyName)
                                        }
                                        else
                                        {
                                         console.log(err)
                                        }
                                     }
                                     else
                                     {
                                     console.log("Metadata added in League:"+LeagueName+"\n For currency:"+StartCurrencyName+"--->"+EndCurrencyName)
                                     }                                        
                                 });
                             });
                            }
                            else
                            {
                                console.log("No metadata added due to lack of data in League:"+LeagueName+"\n For currency:"+StartCurrencyName+"--->"+EndCurrencyName)
                            }
                          });
                      }
                    });
                });
              });
            });
          }
        });   
    });
  });
}