const intervalBetweenCollections = 3600000// 1 hour in milliseconds
const mysql = require('mysql');//allows the program to use the mysql modual for node.js
const con = mysql.createConnection({//connection to the database
    host: "104.199.107.101",
    user: "DataProccesor",
    password: "sKeYXfn3ra8HBDQ",
    database: 'poe_tools_db',
});

getLeagueAndCurrencyIds()
setInterval(getLeagueAndCurrencyIds, intervalBetweenCollections)//set interval calls the function in the first parameter after every interval defined by the second parameter has passed

function getLeagueAndCurrencyIds() {
    deleteStaleMarketData()
    console.log("dataProcessing has begun")
    con.query("SELECT leagueId,leagueName FROM leagueIds", function (err, result, ) {//selects all of the league names with their ids
        if (err) throw err;
        JSON.stringify(result)
        result.forEach(league => {//this foreach loop goes though each response from the sql query
            const leagueId = league.leagueId//assigns the leagues id to a constant
            const leagueName = league.leagueName////assigns the leagues name to a constant
            console.log("Processing data for league:" + leagueName)
            //the sql query below get the currencyidrelates to and the currency name for each entry where the id and the relates to are the same therefore only get the main name for each currency as opposed to the alaises aswell
            con.query("SELECT currencyIdRelatesTo,currencyTextName FROM currencyIds WHERE currencyIdRelatesTo = CurrencyId", function (err, result, ) {
                if (err) throw err;
                JSON.stringify(result)
                result.forEach(startCurrency => {//loops though the results and assigns constants for the start currency
                    const startCurrencyId = startCurrency.currencyIdRelatesTo
                    const startCurrencyName = startCurrency.currencyTextName
                    result.forEach(endCurrency => {//loops though the results a second time assigning end currency constants
                        const endCurrencyName = endCurrency.currencyTextName
                        const endCurrencyId = endCurrency.currencyIdRelatesTo
                        generateStatistics(leagueId, startCurrencyId, endCurrencyId, leagueName, startCurrencyName, endCurrencyName)//calls the generateStatistics function with the constants
                    });
                });
            });
        });
    });
}
function generateStatistics(leagueId, startCurrencyId, endCurrencyId, leagueName, startCurrencyName, endCurrencyName) {
    //below query selects price for the market items table based on paramaters passed into the function so that statistics can be calculated
    con.query("SELECT price FROM marketItems WHERE  startingCurrency = '" + startCurrencyId + "' AND endCurrency = '" + endCurrencyId + "' AND leagueId = '" + leagueId + "' AND time >= '" + dateTimeDisplacement(-1) + "' ORDER BY price ASC", function (err, result, ) {
        if (err) throw err;
        if (result.length > 5) {//if there are less than 5 result no data is entered for this currency and league combination in at the current sample
            //varaibles are assign before being given values later
            let median
            let medianNo
            let mean
            let max
            let min
            let firstQuart
            let thirdQuart
            let iqr
            let total
            if (result.length % 2 == 0) {//if the result has and even number of item the length/2 is used for the median no
                medianNo = result.length / 2
                median = result[medianNo - 1].price//set median to the price property of the result[medianNo-1]
            }
            else {//if the result does not have an even number of items (length+1)/2 is used of the median no
                medianNo = (result.length + 1) / 2
                median = result[medianNo - 1].price//set median to the price property of the result[medianNo-1]
            }
            if (medianNo % 2 == 0) {//if the medianNo is equal first and third quartile values are set
                firstQuart = result[medianNo / 2 - 1].price
                thirdQuart = result[medianNo + medianNo / 2 - 1].price
            }
            else {//if the medianNo is not equal 1 has to be added to it before finding first and third quartile values
                firstQuart = result[(medianNo + 1) / 2 - 1].price
                thirdQuart = result[medianNo + (medianNo + 1) / 2 - 1].price
            }
            iqr = thirdQuart - firstQuart//interquatile range is calculated for used when discounting outliers
            //this query using the median and the iqr to calculate outliers inorder to discount outliers to help safeguard against price fixing by using Between in the Sql
            con.query("SELECT price FROM marketItems WHERE  startingCurrency = '" + startCurrencyId + "' AND endCurrency = '" + endCurrencyId + "' AND leagueId = '" + leagueId + "' AND time >= '" + dateTimeDisplacement(-1) + "' AND price BETWEEN '" + (median - 1.5 * iqr) + "'AND '" + (median + 1.5 * iqr) + "' ORDER BY price ASC", function (err, result, ) {
                if (err) throw err
                if (result.length > 5) {//if there are less than 5 listings for a currency trade once discounting outliers there is not enough data to provide realible pricing predictions
                    min = result[0].price//sets the min to a value from the results
                    max = result[0].price//sets the min to a value from the results
                    total = 0 // set the current total to 0
                    result.forEach(currentResult => {//loops though each result from the sql query
                        currentResultPrice = currentResult.price
                        if (currentResultPrice < min) {//if the price of the current result is lower than the current min it becomes the new min
                            min = currentResultPrice
                        }
                        if (currentResultPrice > max) {//if the price of the current result is higher than the current min it becomes the new max
                            max = currentResultPrice
                        }
                        total = total + currentResultPrice//adds to the runnning total
                    });
                    mean = total / result.length//calculates the mean

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
                console.log("data traunicated")//output that there is data truncation into the logs
            }
            else if (err) throw err
        }
        console.log("Inserted market statisics\n Startcurrency:", startCurrencyName, "\n Endcurrency:", endCurrencyName, "\n League:", leagueName, "data:", median, firstQuart, thirdQuart, min, max, mean, leagueId, startCurrencyId, endCurrencyId)//outputs to the log to show datahas been inserted
    })
}
function deleteStaleMarketData()//deletes data older than 1 hour as it is likely outdated as the people who posted those listings are now offline
{
    con.query("DELETE FROM marketItems WHERE TIME<='" + dateTimeDisplacement(-1) + "'", function (err, result, ) { //sql query to delete things in the market items table with a time that is more than 1 hour ago
        if (err) throw err;
        console.log("delete " + result.affectedRows + " rows as they where stale and no longer relevent")//outputs how many rows have been deleted from the table
    })
}
function dateTimeDisplacement(displacement)//this function returns the current time in iso format but with the displace that is passed into the function added to it
{
    let dateTime = new Date(Date.now())//gets the current time
    dateTime.setHours(dateTime.getHours() + displacement)//takes displacement away from the current time
    dateTime = dateTime.toISOString().replace("T", " ").replace("Z", "")//takes the currency iso format time and makes it match the time format sql uses
    return dateTime//returns a date and time in the format YYYY-MM-DD HH-MM-SS.ms
}