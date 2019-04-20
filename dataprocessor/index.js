const intervalBetweenCollections = 3600000// 1 hour in milliseconds
const mysql = require('mysql');//allows the program to use the mysql modual for node.js
const con = mysql.createConnection({
    host: "104.199.107.101",
    user: "DataProccesor",
    password: "sKeYXfn3ra8HBDQ",
    database: 'poe_tools_db',
});

getLeagueAndCurrencyIds()
setInterval(getLeagueAndCurrencyIds, intervalBetweenCollections)

function getLeagueAndCurrencyIds() {
    deleteStaleMarketData()
    console.log("dataProcessing has begun")
    con.query("SELECT leagueId,leagueName FROM leagueIds", function (err, result, ) {
        if (err) throw err;
        JSON.stringify(result)
        result.forEach(league => {
            const leagueId = league.leagueId
            const leagueName = league.leagueName
            console.log("Processing data for league:" + leagueName)
            con.query("SELECT currencyIdRelatesTo,currencyTextName FROM currencyIds WHERE currencyIdRelatesTo = CurrencyId", function (err, result, ) {
                if (err) throw err;
                JSON.stringify(result)
                result.forEach(startCurrency => {
                    const startCurrencyId = startCurrency.currencyIdRelatesTo
                    const startCurrencyName = startCurrency.currencyTextName
                    result.forEach(endCurrency => {
                        const endCurrencyName = endCurrency.currencyTextName
                        const endCurrencyId = endCurrency.currencyIdRelatesTo
                        generateStatistics(leagueId, startCurrencyId, endCurrencyId, leagueName, startCurrencyName, endCurrencyName)
                    });
                });
            });
        });
    });
}
function generateStatistics(leagueId, startCurrencyId, endCurrencyId, leagueName, startCurrencyName, endCurrencyName) {
    con.query("SELECT price FROM marketItems WHERE  startingCurrency = '" + startCurrencyId + "' AND endCurrency = '" + endCurrencyId + "' AND leagueId = '" + leagueId + "' AND time >= '" + dateTimeDisplacement(-1) + "' ORDER BY price ASC", function (err, result, ) {
        if (err) throw err;
        if (result.length > 5) {
            let median
            let medianNo
            let mean
            let max
            let min
            let firstQuart
            let thirdQuart
            let iqr
            let total
            if (result.length % 2 == 0) {
                medianNo = result.length / 2
                median = result[medianNo - 1].price
            }
            else {
                medianNo = (result.length + 1) / 2
                median = result[medianNo - 1].price
            }
            if (medianNo % 2 == 0) {
                firstQuart = result[medianNo / 2 - 1].price
                thirdQuart = result[medianNo + medianNo / 2 - 1].price
            }
            else {
                firstQuart = result[(medianNo + 1) / 2 - 1].price
                thirdQuart = result[medianNo + (medianNo + 1) / 2 - 1].price
            }
            iqr = thirdQuart - firstQuart
            //this query using the median and the iqr to calculate outliers inorder to discount outliers to help safeguard against price fixing by using Between in the Sql
            con.query("SELECT price FROM marketItems WHERE  startingCurrency = '" + startCurrencyId + "' AND endCurrency = '" + endCurrencyId + "' AND leagueId = '" + leagueId + "' AND time >= '" + dateTimeDisplacement(-1) + "' AND price BETWEEN '" + (median - 1.5 * iqr) + "'AND '" + (median + 1.5 * iqr) + "' ORDER BY price ASC", function (err, result, ) {
                if (err) throw err
                if (result.length > 5) {
                    min = result[0].price
                    max = result[0].price
                    total = 0
                    result.forEach(currentResult => {
                        currentResultPrice = currentResult.price
                        if (currentResultPrice < min) {
                            min = currentResultPrice
                        }
                        if (currentResultPrice > max) {
                            max = currentResultPrice
                        }
                        total = total + currentResultPrice
                    });
                    mean = total / result.length

                    insertStatistics(median, firstQuart, thirdQuart, min, max, mean, leagueId, startCurrencyId, endCurrencyId, leagueName, startCurrencyName, endCurrencyName)
                }
            })
        }
    })
}
function insertStatistics(median, firstQuart, thirdQuart, min, max, mean, leagueId, startCurrencyId, endCurrencyId, leagueName, startCurrencyName, endCurrencyName) {
    let currentDateTime = dateTimeDisplacement(0)
    //sql query to insert the statistics that have been calcutaled into the table
    con.query("INSERT INTO marketStatistics(median, lowerQuartile, upperQuartile, min, max, mean, leagueId, startingCurrency, endCurrency, time) VALUES ('" + median + "','" + firstQuart + "','" + thirdQuart + "','" + min + "','" + max + "','" + mean + "','" + leagueId + "','" + startCurrencyId + "','" + endCurrencyId + "','" + currentDateTime + "')", function (err, result, ) {
        if (err) {
            if ((err.toString()).includes("WARN_DATA_TRUNCATED")) //this error means that data was traunicated and can be ignored as it is expected
            {
                console.log("data traunicated")
            }
            else if (err) throw err
        }
        console.log("Inserted market statisics\n Startcurrency:", startCurrencyName, "\n Endcurrency:", endCurrencyName, "\n League:", leagueName, "data:", median, firstQuart, thirdQuart, min, max, mean, leagueId, startCurrencyId, endCurrencyId)//outputs how many rows have been deleted from the table
    })
}
function deleteStaleMarketData()//deletes data older than 1 hour as it is likely outdated as the people who posted those listings are now offline
{
    con.query("DELETE FROM marketItems WHERE TIME<='" + dateTimeDisplacement(-1) + "'", function (err, result, ) //sql query to delete things in the market items table with a time that is more than 1 hour ago
    {
        if (err) throw err;
        console.log("delete " + result.affectedRows + " rows as they where stale and no longer relevent")//outputs how many rows have been deleted from the table
    })
}
function dateTimeDisplacement(displacement)//this function returns the current time in iso format but with the displace that is passed into the function added to it
{
    let dateTime = new Date(Date.now())//gets the current time
    dateTime.setHours(dateTime.getHours() + displacement)//takes displacement away from the current time
    dateTime = dateTime.toISOString().replace("T", " ").replace("Z", "")//takes the currency iso format time and makes it match the time format sql uses
    return dateTime
}