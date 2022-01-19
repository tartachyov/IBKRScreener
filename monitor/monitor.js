import fs from "fs"
// import fastcsv from 'fast-csv'

import { Client, Contract } from "ib-tws-api"
import { execSync } from 'child_process'
import pkg from 'mongodb'
const { MongoClient } = pkg


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function neverResolve() {
    process.stdout.write("Reached never resolve point\n")
    return new Promise(resolve => { })
}

function precisionRound(number, precision) {
    var factor = Math.pow(10, precision)
    return Math.round(number * factor) / factor
}

function getClosestLevel(last, levels) {
    let minDiff = last - levels[0]
    let closest = levels[0]
    if (minDiff < 0) { minDiff = minDiff * (-1) }
    for (let i = 1; i < levels.length; i++) {
        let diff = last - levels[i]
        if (diff < 0) { diff = diff * (-1) }
        if (diff < minDiff) {
            minDiff = diff
            closest = levels[i]
        }
    }

    return closest
}

function addMinutes(date, minutes) {
    return new Date(date.valueOf() + minutes * 60 * 1000)
}
function addDays(date, days) {
    return new Date(date.valueOf() + days * 24 * 60 * 60 * 1000)
}

var DBClient

function checkIsNotificationNew(tickerName, closestLevel) {
    return new Promise(resolve => {
        // MongoClient.connect("mongodb://127.0.0.1:27017", function (err, client) {
        // if (err) {
        //     console.log("Mongo check alerts " + JSON.stringify(err))
        //     return resolve(false)
        // }

        const dbName = "trading"
        const db = DBClient.db(dbName)

        const alertsCollection = db.collection('alerts')
        // console.log(addMinutes(new Date(), -10))
        alertsCollection.findOne({
            ticker: tickerName,
            level: closestLevel,
            time: { $gt: addMinutes(new Date(), -30) }
        }, (err, alertItem) => {
            if (err) {
                console.log("Mongo find alert " + JSON.stringify(err))
            }
            // console.log(alertItem)
            if (alertItem) {
                return resolve(false)
                // client.close()
            } else {
                alertsCollection.insertOne({
                    ticker: tickerName,
                    level: closestLevel,
                    time: new Date(),
                }, () => {
                    // client.close()
                })
            }

            return resolve(true)
        })
        // })
    })
}

function levelsInGap(from, till, levels) {
    let levelsInGap = []
    if (levels) {
        for (let i = 0; i < levels.length; i++) {
            if (precisionRound(levels[i], 2) > precisionRound(from, 2) && precisionRound(levels[i], 2) < precisionRound(from + till, 2)) {
                levelsInGap.push(precisionRound(levels[i], 2))
            }
        }
    }

    return levelsInGap
}

var globalLocked = []

function isNearby(levels, ticker) {
    let closestLevel = getClosestLevel(ticker.last, levels)

    let priceRange = 0.05
    if (ticker.last > 15 && ticker.last > closestLevel) {
        priceRange = 0.10
    }
    if (ticker.last > 50 && ticker.last > closestLevel) {
        priceRange = 0.30
    }

    if (ticker.last < closestLevel + priceRange && ticker.last > closestLevel) {
        return true
    } else if (ticker.last < closestLevel && ticker.last > closestLevel - priceRange) {
        return true
    }

    return false
}

function roundDate(date) {
    if (date instanceof Date) {
        let timeStamp = date.valueOf()
        timeStamp -= timeStamp % (24 * 60 * 60 * 1000) //substract amount of time since midnight
        timeStamp += date.getTimezoneOffset() * 60 * 1000 //add on the timezone offset 
        return new Date(timeStamp)
    }

    return new Date()
}

function startStream(api,
    tickerName,
    manual = [],
    lastHomework,

    dayTouches = [],
    dayExtremums = [],
    rowTouches = [],
    touches5min = [],
    rowTouches5min = [],
    // maxPrice = 30
) {
    console.log("subscribed: " + tickerName)
    let contract = Contract.stock(tickerName)
    let e = api.streamMarketData({
        contract: contract
    })
    e.on('tick', async (t) => {
        // await sleep(200)
        // console.log(tickerName + ":")
        // console.log(t.ticker)
        // console.log("\n")

        // console.log(precisionRound(t.ticker.last, 2))
        // console.log(precisionRound(t.ticker.last - 0.02, 2))

        if (!globalLocked.includes(tickerName)) {
            globalLocked.push(tickerName)
        } else {
            return
        }

        if (
            t.ticker.last &&
            // t.ticker.last < maxPrice &&
            isNearby(manual, t.ticker)
        ) {
            let closestLevel = getClosestLevel(t.ticker.last, manual)

            let potentialRange = 0.25
            let maxStop, maxSpread, sharesToBuy
            if (t.ticker.last > 15) {
                potentialRange = 0.40
            }
            if (t.ticker.last > 50) {
                potentialRange = 0.80
            }

            // FIXME: ATR take to count

            if (manual.indexOf(closestLevel) < manual.length - 1 &&
                precisionRound(manual[manual.indexOf(closestLevel) + 1] - manual[manual.indexOf(closestLevel)], 2) > potentialRange) {
                potentialRange = precisionRound(manual[manual.indexOf(closestLevel) + 1] - manual[manual.indexOf(closestLevel)], 2)
            }
            maxStop = precisionRound(potentialRange / 3, 2)
            sharesToBuy = Math.round(600 / closestLevel) // FIXME: pass balance instead of 600
            if (sharesToBuy > 100) { sharesToBuy = 100 }
            if (maxStop * sharesToBuy > 8) {
                maxStop = precisionRound(8 / sharesToBuy, 2)
            }
            maxSpread = maxStop / 2
            if (maxSpread > 0.2) { maxSpread = 0.2 } else if (maxSpread < 0.04) { maxSpread = 0.04 }

            // console.log(newNotification)
            // console.log(closestLevel, manual, manual[manual.indexOf(closestLevel) + 1], manual[manual.indexOf(closestLevel)])
            if (t.ticker.ask &&
                t.ticker.bid &&
                t.ticker.ask - t.ticker.bid < maxSpread &&
                (
                    manual.indexOf(closestLevel) == manual.length - 1
                    ||
                    precisionRound(manual[manual.indexOf(closestLevel) + 1] - manual[manual.indexOf(closestLevel)], 2) >= potentialRange
                )
            ) {
                // MongoClient.connect("mongodb://127.0.0.1:27017", function (err, client) {
                //     if (err) {
                //         console.log("Mongo " + JSON.stringify(err))
                //         return
                //     }
                //     const dbName = "trading"
                //     const db = client.db(dbName)
                //     const alertsCollection = db.collection('alerts')
                //     alertsCollection.insertOne({
                //         ticker: tickerName,
                //         level: closestLevel,
                //         time: new Date(),
                //     }, () => {
                //         client.close()
                //     })
                // })

                let newNotification = await checkIsNotificationNew(tickerName, closestLevel)
                if (newNotification) {

                    let dayTouchesInGap = levelsInGap(closestLevel, potentialRange, dayTouches)
                    let dayExtremumsInGap = levelsInGap(closestLevel, potentialRange, dayExtremums)
                    let rowTouchesInGap = levelsInGap(closestLevel, potentialRange, rowTouches)

                    let touches5minInGap = levelsInGap(closestLevel, potentialRange, touches5min)
                    let rowTouches5minInGap = levelsInGap(closestLevel, potentialRange, rowTouches5min)

                    let message = tickerName +
                        " reached level " +
                        closestLevel +
                        (dayTouchesInGap.length > 0 ||
                            dayExtremumsInGap.length > 0 ||
                            rowTouchesInGap.length > 0 ||
                            touches5minInGap.length > 0 ||
                            rowTouches5minInGap.length > 0 ?
                            " with interlevels"
                            :
                            "")

                    let colorMessage = `\x1b[1m${tickerName}\x1b[0m` +
                        "\n     Reached level: " +
                        `\x1b[1m${closestLevel}\x1b[0m` +
                        (dayTouchesInGap.length > 0 ||
                            dayExtremumsInGap.length > 0 ||
                            rowTouchesInGap.length > 0 ||
                            touches5minInGap.length > 0 ||
                            rowTouches5minInGap.length > 0 ?
                            " with interlevels"
                            :
                            "")

                    execSync(`Say "${message}"`)

                    // Reset = "\x1b[0m"
                    // Bright = "\x1b[1m"
                    // Dim = "\x1b[2m"
                    // Underscore = "\x1b[4m"
                    // Blink = "\x1b[5m"
                    // Reverse = "\x1b[7m"
                    // Hidden = "\x1b[8m"

                    // FgBlack = "\x1b[30m"
                    // FgRed = "\x1b[31m"
                    // FgGreen = "\x1b[32m"
                    // FgYellow = "\x1b[33m"
                    // FgBlue = "\x1b[34m"
                    // FgMagenta = "\x1b[35m"
                    // FgCyan = "\x1b[36m"
                    // FgWhite = "\x1b[37m"

                    // BgBlack = "\x1b[40m"
                    // BgRed = "\x1b[41m"
                    // BgGreen = "\x1b[42m"
                    // BgYellow = "\x1b[43m"
                    // BgBlue = "\x1b[44m"
                    // BgMagenta = "\x1b[45m"
                    // BgCyan = "\x1b[46m"
                    // BgWhite = "\x1b[47m"

                    let fullMessage = (new Date()).toLocaleTimeString() + " " + colorMessage + "\n" +
                        (dayExtremumsInGap.length > 0 ? `\x1b[33m     Day extremums\x1b[0m: ${dayExtremumsInGap.join(", ")} \n` : "") +
                        (dayTouchesInGap.length > 0 ? `\x1b[33m       Day touches\x1b[0m: ${dayTouchesInGap.join(", ")} \n` : "") +
                        (rowTouchesInGap.length > 0 ? `\x1b[33m       Row touches\x1b[0m: ${rowTouchesInGap.join(", ")} \n` : "") +
                        (touches5minInGap.length > 0 ? `\x1b[33m      Touches 5min\x1b[0m: ${touches5minInGap.join(", ")} \n` : "") +
                        (rowTouches5minInGap.length > 0 ? `\x1b[33m  Row touches 5min\x1b[0m: ${rowTouches5minInGap.join(", ")} \n` : "") +
                        `            Shares: \x1b[1m${sharesToBuy}\x1b[0m \n              Stop: \x1b[1m${maxStop}\x1b[0m \n  Potential growth: ${potentialRange} \n           Last HW: ${lastHomework &&
                        (
                            roundDate(lastHomework) < roundDate(new Date()) ?
                                "\x1b[33m" + lastHomework.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }) + "\x1b[0m"
                                :
                                lastHomework.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
                        )}\n`

                    console.log(fullMessage)

                    // TODO: monitor what's happening to ticker comparing to level after reached: break out (and fixed), false break out 1 / 2 bar(-s), bounced 3 bars
                }
            }
        }

        globalLocked.splice(globalLocked.indexOf(tickerName), 1)

        return
    })
    e.on('error', (e) => {
        console.log('error ' + tickerName)
        console.log(e)
        console.log("\n")
    })

    return
}

async function run() {

    process.stdout.write("maxPrice: " + parseFloat(process.env.maxPrice) + "\n")

    MongoClient.connect("mongodb://127.0.0.1:27017", function (err, client) {
        if (err) {
            console.log("Mongo " + JSON.stringify(err))
            return
        }

        DBClient = client
        const dbName = "trading"
        const db = client.db(dbName)

        const stocksCollection = db.collection('stocks')
        stocksCollection.find({
            manual: { $exists: true },
            lastHomework: { $gt: addDays(new Date(), -5) } // -7, -10, -14
        }).toArray(async function (err, tickers) {
            if (err) {
                console.log("Mongo " + JSON.stringify(err))
            } else if (tickers && tickers.length > 0) {
                let api = new Client();
                await api.connect({
                    host: '127.0.0.1',
                    port: 7497
                })
                const homeworkCollection = db.collection('homework')

                for (let i = 0; i < tickers.length; i++) {
                    homeworkCollection.findOne({ _id: tickers[i].lastHomework }, function (err, hwObj) {
                        if (err) {
                            console.log("Mongo " + JSON.stringify(err))
                            return
                        }

                        startStream(api,
                            tickers[i]._id,
                            tickers[i].manual.sort((a, b) => { return a - b }),
                            tickers[i].lastHomework,

                            tickers[i].dayTouches,
                            tickers[i].dayExtremums,
                            tickers[i].rowTouches,
                            (hwObj && hwObj[tickers[i]._id] && hwObj[tickers[i]._id].touches5min),
                            (hwObj && hwObj[tickers[i]._id] && hwObj[tickers[i]._id].rowTouches5min),
                            // parseFloat(process.env.maxPrice),
                        ) // TODO: monitor also all non-manual levels and then identify group of level on output
                    })
                }
            }
            // client.close()
        })

    })

    // + track stock last homework date + and maybe new levels when addedToSet

    await neverResolve()
}

run()