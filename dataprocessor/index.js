const  mysql = require('mysql');
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "pass",
    database : 'PathTool',
  });

  con.query("SELECT LeagueId FROM LeagueIds WHERE Depricated = false ", function (err, result,) 
  {
    if(err) throw err;
    JSON.stringify(result)
    result.forEach(LeagueId => {
        LeagueId = LeagueId.LeagueId
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
            con.query("SELECT DISTINCT RelatesTo FROM CurrencyIds", function (err, result,) 
            {
              if(err) throw err;
              JSON.stringify(result)
              result.forEach(StartCurrencyId => {
                  StartCurrencyId = StartCurrencyId.RelatesTo
                  result.forEach(EndCurrencyId => {
                    EndCurrencyId = EndCurrencyId.RelatesTo
                    WhereLeagueStartEnd = "LeagueId = '"+LeagueId+"'AND CurrencyId ='"+StartCurrencyId+"'AND ListedForId='"+EndCurrencyId+"'"
                    con.query("SELECT Price FROM CurrencyItems WHERE "+WhereLeagueStartEnd+"ORDER BY Price ASC", function (err, result,) 
                    {
                      if(err) throw err;
                      JSON.stringify(result)
                      const length = result.length
                      if(length>0)
                      {
                          resultsFound = true
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
                                 con.query("INSERT INTO CurrencyMetadata (StartCurrencyId,EndCurrencyId,LeagueId,SampleAt,FirstQuartile,Median,ThirdQuartile,Min,Max,Mean,Mode,StandardDeviation,ConversionRate, SampleSize) VALUES ('"+StartCurrencyId+"','"+EndCurrencyId+"','"+LeagueId+"','"+DateTime+"','"+FirstQuartile+"','"+median+"','"+ThirdQuartile+"','"+min+"','"+max+"','"+mean+"','"+mode+"','"+standardDeviation+"','"+conversionRate+"','"+result.length+"')" , function (err, result,) 
                                 {
                                     console.log("metadata added")
                                 });
                             });
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