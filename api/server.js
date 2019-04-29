const express = require('express')//here constants are set  such as importing the router and connecting to the database
const app = express()
const mysql = require("mysql")
const port = "3000"
const con = mysql.createConnection({
    host: "104.199.107.101",
    user: "DataProccesor",
    password: "sKeYXfn3ra8HBDQ",
    database: 'poe_tools_db',
});
con.connect();

var sqlreq = {//the sqlreq class is defined here
    getTradePaths: function (req, res) {
        console.log("paths request recieved")//logs to the console to show the function has started
        let input = (((req.url.replace(/!/g, " ")).replace(/%27/g, "'")).split("?")[1]).split("$")//seperate the request the api has been sent aswell as replacing certain charaters that cannot be put in web addresses
        let startCurrency = input[0]//set various varibles
        let targetCurrency = input[1]
        let league = input[2]
        let TotallifeSpan = input[3]
        let currencyIds
        let leagueId
        let paths = []//create the out array as empty
        //sql request to create in array of objects containing currency ids and the corresponding text name
        con.query("SELECT currencyTextName, currencyId FROM currencyIds WHERE currencyIdRelatesTo = CurrencyId", function (err, result, ) {
            if (err) { res.send(err); }
            else { currencyIds = result }//create currencyIds array
            let originalCurrencyId //define a pair of varibles to be set later
            let targetCurrencyId
            currencyIds.forEach(current => {//foreach to loop though the currencyIds array to test to search for the start and end currency ids for the calcPaths function
                if (current.currencyTextName == startCurrency) {
                    originalCurrencyId = current.currencyId
                }
                if (current.currencyTextName == targetCurrency) {
                    targetCurrencyId = current.currencyId
                }
            });
            //the following sql query is to get the corresponding league id for the league name that came from the url
            con.query("SELECT leagueId FROM leagueIds WHERE leagueName = '" + league + "'", function (err, result, ) {
                if (err) { console(err); }
                else { leagueId = result[0].leagueId }//set a varible to the result
                //call the function calcPaths which returns a promise so that i can use .then to run code after it has returned value is the value of the promise once it resolves
                calcPaths(currencyIds, originalCurrencyId, startCurrency, targetCurrencyId, 0, startCurrency + ":1", 1).then(function (value) {
                    function compare(a, b) {//define compare function for use in the .sort() later
                        let value1 = a.finalAmount//set value to the final amount property of object a
                        let value2 = b.finalAmount//set value to the final amouut propert of object b
                        let comparrison = 0 //set comparrison to 0 so the in the event value1 and value 2 and equal they don't swap
                        if (value1 > value2) {
                            comparrison = -1//set comparrison so that is value1 is bigger it is place to the right in the array
                        }
                        else if (value1 < value2) {
                            comparrison = 1//set comparrison so that is value2 is bigger it is place to the right in the array
                        }
                        return comparrison//return the coparrison varrible
                    }


                    res.send(paths.sort(compare))//send the result of paths.sort(compare) as the response from the api
                    console.log(paths.sort(compare))
                })
            });
        });
        //definintion of calcPaths
        function calcPaths(currencyIds, startCurrencyId, startCurrencyName, idOfTarget, lifeSpan, pathInText, amount) {
            return new Promise(function (resolve, reject) { //returns a promise
                if (lifeSpan < TotallifeSpan) {//compare lifeSpan to TotallifeSpan because this function is recursive lifespan increases each time the function is called once it is equal to total lifespan
                    lifeSpan++//increase lifespan
                    //this sql querry get the mean and end currency but only the most recent enty for each end currency where the starting id and league id are equal to those passed in the function
                    con.query("SELECT endCurrency, mean FROM marketStatistics WHERE statsId IN (SELECT MAX(statsId) FROM marketStatistics WHERE startingCurrency='" + startCurrencyId + "' AND leagueId='" + leagueId + "'GROUP BY endCurrency)", function (err, result, ) {
                        if (err) { res.send(err); } else {
                            if (result[0] != undefined) {//this if check if data was returned as sometimes the result will be blank if there are no trades start with a currency but there are others that trade to it

                                function loop() {//this function is a loop that I want to run code after it has finished so it is defined to return a promise
                                    return new Promise(function (resolve, reject) {
                                        let counter = result.length//counter is set to the length property of result
                                        result.forEach(destintion => {//a for each loop for result as destination

                                            let currencyName
                                            currencyIds.forEach(current => {
                                                if (current.currencyId == destintion.endCurrency) {//find the currency name for the destination.endCurrency
                                                    currencyName = current.currencyTextName
                                                }
                                            });
                                            let newAmount = amount * destintion.mean//this the amount by the mean which is the mean price of 1 orb to get the new
                                            let newpathInText = pathInText + "--->" + currencyName + ":" + newAmount//add an arrow the new currecny and how much you will have of it the the path
                                            //recursively call calc props expand extend the path
                                            calcPaths(currencyIds, destintion.endCurrency, currencyName, idOfTarget, lifeSpan, newpathInText, newAmount).then(function (value) {
                                                //code inside this then is proformed once calcPaths called above returns a value
                                                counter = counter - 1//the counter varible set at the start of the loop function is reduced by 1
                                                if (value != undefined) {//is calcPaths returns a value create an object based on the properties of the value it returned and push that to the paths array
                                                    let objToAdd
                                                    if (value.path != undefined) {
                                                        let pathToAdd = value.path
                                                        let finalToAdd = value.finalAmount
                                                        objToAdd = {
                                                            path: pathToAdd,
                                                            finalAmount: finalToAdd
                                                        }
                                                        paths.push(objToAdd)
                                                    }
                                                }
                                                if (counter == 0) {//once the counter is 0 that means the loop has finished and the promise can be resolved
                                                    resolve()
                                                }
                                            })

                                        });

                                    })
                                }
                                loop().then(function () {//calls loop and then resolves the promise from the start of the calcPaths function as null
                                    resolve()
                                })

                            } else {
                                resolve()//resolves promise at the start of calcPaths as null
                            }

                        }
                    });
                } else if (startCurrencyId == idOfTarget) {//once lifespan equals the totallifespan the function checks if startCurrencyId which is passed into it is equal to idOfTarget which is also passed into it
                    let thisTradePath = {
                        path: pathInText,
                        finalAmount: amount
                    };//creates an onject with the properties of path which in equal to the pathInText and finalAmount equal to the paramenters passed into the function and 
                    resolve(thisTradePath)//resolves the promise of the instances of this function with .then afterwards can preform the contained code
                } else {
                    resolve()//resoloves the promise without a value
                }
            })
        }
    },
    addNewCurrency: function (req, res) {
        let input = (((req.url.replace(/!/g, " ")).replace(/%27/g, "'")).split("?")[1]).split("$")//seperate the url into various arguments
        let main = input[0]
        let aliases = input[1].split("%")
        //below query inserts the main name for the currency into the table without a value for currencyIdRelatesTo
        con.query("INSERT INTO currencyIds (currencyTextName) VALUES ('" + main + "')", function (err, result) {
            //below query selects the record just inserted to get its currencyId
            con.query("SELECT currencyId FROM currencyIds WHERE currencyTextName ='" + main + "'", function (err, result, ) {
                if (err) throw err;
                let mainId = result[0].currencyId
                //below query updates the record just inserted to have currencyIdrelatesTo equal to its currencyId
                con.query("UPDATE currencyIds SET currencyIdRelatesTo ='" + mainId + "' WHERE currencyId='" + mainId + "'", function (err, result, ) {
                    if (err) throw err;
                    //loops though each alias
                    aliases.forEach(alias => {
                        //the below query adds each alias into currencyIds with currencyIdRelatesTo equal to currencyId of the main currency name
                        con.query("INSERT INTO currencyIds (currencyTextName,currencyIdRelatesTo) VALUES ('" + alias + "','" + mainId + "')", function (err, result, ) {
                            if (err) throw err;
                        });
                    });
                });
            });
        })
    },
    getAllLeagues: function (req, res) {
        console.log("leauges Request recieved")
        //query to get league names form the table
        con.query("SELECT leagueName FROM leagueIds", function (err, result, ) {
            if (err) throw err;
            res.send(result)//sends result of the sql resquest to the site
        });
    },
    getAllCurrencies: function (req, res) {
        //query to get the names of all currencies from the table for the site
        con.query("SELECT currencyTextName FROM currencyIds WHERE currencyIdRelatesTo = CurrencyId", function (err, result, ) {
            if (err) { res.send(err); }//in the case of an sql error it sends the error 
            else { res.send(result) }//otherwise it sends the result of the query to the site
        });
    },
    getPriceTimeData: function (req, res) {
        let url = req.url.replace("%", " ")
        let splitUrl = url.split("/")
        let league = splitUrl[3]
        let startCurrency = splitUrl[4]
        let targetCurrency = splitUrl[5]
        let startCurrencyId = 0
        let targetCurrencyId = 0
        let leagueId = 0
        let output = "something failed"
        con.query("SELECT LeagueId FROM LeagueIds  WHERE LeagueName ='" + league + "'", function (err, result, ) {
            if (err) res.send(err);
            if (result[0] != undefined) {
                leagueId = result[0].LeagueId
            }
            con.query("SELECT RelatesTo FROM CurrencyIds  WHERE TextName ='" + startCurrency.replace("'", "''") + "'", function (err, result, ) {
                if (err) res.send(err);
                if (result[0] != undefined) {
                    startCurrencyId = result[0].RelatesTo
                }
                con.query("SELECT RelatesTo FROM CurrencyIds  WHERE TextName ='" + targetCurrency.replace("'", "''") + "'", function (err, result, ) {
                    if (err) res.send(err);
                    if (result[0] != undefined) {
                        targetCurrencyId = result[0].RelatesTo
                    }
                    con.query("SELECT SampleAt,FirstQuartile,Median,ThirdQuartile,Min,Max,Mean,Mode,ConversionRate,SampleSize FROM CurrencyMetadata,CurrencyIds  WHERE LeagueId ='" + leagueId + "' AND  StartCurrencyId ='" + startCurrencyId + "' AND EndCurrencyId='" + targetCurrencyId + "' ORDER BY Sampleat ASC", function (err, result, ) {
                        if (err) res.send(err);
                        if (result[0] != undefined) {
                            let sampleAt = ""
                            let firstQuartile = ""
                            let median = ""
                            let thirdQuartile = ""
                            let min = ""
                            let max = ""
                            let mean = ""
                            let mode = ""
                            let conversionRate = ""

                            res.send(result)
                        }
                    })
                })
            })
        })
    }
}
app.route('/sql/gettradepaths/*').get(sqlreq.getTradePaths)
app.route('/sql/addcurrency/*').get(sqlreq.addNewCurrency)
app.route('/sql/leagues').get(sqlreq.getAllLeagues)
app.route('/sql/currencies').get(sqlreq.getAllCurrencies)
app.route('/sql/getPriceTimeData/*').get(sqlreq.getPriceTimeData)
app.listen(port, () => console.log("api hosted on " + port))