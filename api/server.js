const express = require('express')
const app = express()
const port = 3000
const mysql  = require("mysql")
const con = mysql.createConnection({
    host: "104.199.107.101",
    user: "DataProccesor",
    password: "sKeYXfn3ra8HBDQ",
    database : 'poe_tools_db',
});
con.connect();
var sqlreq = {
    addNewCurrency: function(req, res){
        let input = (((req.url.replace(/!/g," ")).replace(/%27/g,"'")).split("?")[1]).split("$")
        let main = input[0]
        let aliases = input[1].split("%")

        con.query("INSERT INTO currencyIds (currencyTextName) VALUES ('"+main+"')", function (err, result)
        {
            con.query("SELECT currencyId FROM currencyIds WHERE currencyTextName ='"+main+"'", function (err, result,) 
            {
              if(err) throw err;
              let mainId=result[0].currencyId
              
              con.query("UPDATE currencyIds SET currencyIdRelatesTo ='"+mainId+"' WHERE currencyId='"+mainId+"'", function (err, result,) 
              {
                if(err) throw err;
                aliases.forEach(alias => {
                    con.query("INSERT INTO currencyIds (currencyTextName,currencyIdRelatesTo) VALUES ('"+alias+"','"+mainId+"')", function (err, result,) 
                    {
                        if(err) throw err;
                    });
                });
              });
            });
        })
    },
    getAllLeagues: function(req, res){
        con.query("SELECT leagueName FROM leagueIds", function (err, result,) 
        {
          if(err) throw err;
          res.send(result)
        });
    },
    getAllCurrencies: function(req, res){
        con.query("SELECT currencyTextName FROM currencyIds WHERE currencyIdRelatesTo = CurrencyId", function (err, result,) 
        {
          if(err) {res.send(err);}
          else{res.send(result)}
        });
    },
    getPriceTimeData: function(req, res){
        let url = req.url.replace("%"," ")
        let splitUrl = url.split("/")
        let league = splitUrl[3]
        let startCurrency = splitUrl[4]
        let targetCurrency = splitUrl[5]
        let startCurrencyId = 0
        let targetCurrencyId = 0
        let leagueId = 0
        let output = "something failed"
        con.query("SELECT LeagueId FROM LeagueIds  WHERE LeagueName ='"+league+"'", function (err, result,) 
        {
            if(err) res.send(err);
            if(result[0]!=undefined)
            {  
                leagueId = result[0].LeagueId
            }
            con.query("SELECT RelatesTo FROM CurrencyIds  WHERE TextName ='"+startCurrency.replace("'","''")+"'", function (err, result,) 
            {
                if(err) res.send(err);
                if(result[0]!=undefined)
                {  
                    startCurrencyId = result[0].RelatesTo
                } 
                con.query("SELECT RelatesTo FROM CurrencyIds  WHERE TextName ='"+targetCurrency.replace("'","''")+"'", function (err, result,) 
                {
                    if(err) res.send(err);
                    if(result[0]!=undefined)
                    {  
                        targetCurrencyId = result[0].RelatesTo
                    } 
                    con.query("SELECT SampleAt,FirstQuartile,Median,ThirdQuartile,Min,Max,Mean,Mode,ConversionRate,SampleSize FROM CurrencyMetadata,CurrencyIds  WHERE LeagueId ='"+leagueId+"' AND  StartCurrencyId ='"+startCurrencyId+"' AND EndCurrencyId='"+targetCurrencyId+"' ORDER BY Sampleat ASC", function (err, result,) 
                    {
                        if(err) res.send(err);
                        if(result[0]!=undefined)
                        {  
                            let sampleAt = ""
                            let firstQuartile =""
                            let median =""
                            let thirdQuartile=""
                            let min =""
                            let max =""
                            let mean =""
                            let mode=""
                            let conversionRate=""
                            result.forEach(data => {
                                sampleAt = sampleAt+"/"+data.SampleAt.toISOString()
                                firstQuartile = firstQuartile+"/"+data.FirstQuartile
                                thirdQuartile = thirdQuartile+"/"+data.ThirdQuartile
                                median = median+"/"+data.Median
                                min = min+"/"+data.Min
                                max = max+"/"+data.Max
                                mean = mean+"/"+data.Mean
                                mode = mode+"/"+data.Mode
                                conversionRate = conversionRate+"/"+data.ConversionRate
                            });
                            res.send(startCurrencyId+"/"+targetCurrencyId+"/"+mean)
                        }
                    })
                })
            })
        })
    }
}

app.route('/sql/addcurrency/*').get(sqlreq.addNewCurrency)
app.route('/sql/leagues').get(sqlreq.getAllLeagues)
app.route('/sql/currencies').get(sqlreq.getAllCurrencies)
app.route('/sql/getPriceTimeData/*').get(sqlreq.getPriceTimeData)
app.listen(port, () => console.log("api hosted on "+port))