const puppeteer = require("puppeteer")
const fs = require("fs")
const axios = require("axios")
const fastcsv = require('fast-csv')
const MongoClient = require('mongodb').MongoClient
// const https = require("https")
// var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest
// const httpClient = require("http-clientp")

const ibkr = require("@stoqey/ibkr").default
const HistoricalData = require('@stoqey/ibkr').HistoricalData
const getContractDetails = require('@stoqey/ibkr').getContractDetails
const PriceUpdates = require('@stoqey/ibkr').PriceUpdates
const IbkrEvents = require('@stoqey/ibkr').IbkrEvents
const ibkrEvents = IbkrEvents.Instance
const IBKREVENTS = require('@stoqey/ibkr').IBKREVENTS


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function roundDate(date) {
    if (date instanceof Date) { } else {
        date = new Date()
    }
    let timeStamp = date.valueOf()
    timeStamp -= timeStamp % (24 * 60 * 60 * 1000) //substract amount of time since midnight
    timeStamp += date.getTimezoneOffset() * 60 * 1000 //add on the timezone offset 
    return new Date(timeStamp)
}

function getNodeText(page, selector) {
    return new Promise(async (resolve) => {
        try {
            await page.waitForSelector(selector, {
                visible: true,
                timeout: 5000,
            })
        } catch (e) {
            if (e instanceof puppeteer.errors.TimeoutError) {
                process.stderr.write("ERR - text node was NOT reached in time: " + selector)
            } else {
                process.stderr.write(e)
            }
            await page.screenshot({
                path: './app/tests/example.png'
            })
            process.exit(1)
        }
        page.evaluate(`$('${selector}').text()`)
            .then(async function (result) {
                return resolve(result)
            })
    })
}

function precisionRound(number, precision) {
    var factor = Math.pow(10, precision)
    return Math.round(number * factor) / factor
}

// async function getLevels_Deprecated(ticker, price) {
//     return new Promise(resolve => {

//         // let xhr = new XMLHttpRequest()
//         // xhr.open('GET', ("https://localhost:7497/v1/portal/trsrv/stocks?symbols=" + ticker))
//         // xhr.send()
//         // xhr.onload = function () {
//         //     if (xhr.status != 200) { // analyze HTTP status of the response
//         //         process.stderr.write(`Error ${xhr.status}: ${xhr.statusText}`) // e.g. 404: Not Found
//         //     } else { // show the result
//         //         process.stderr.write(`Done, got ${xhr.response.length} bytes`) // response is the server
//         //     }
//         // }
//         // xhr.onprogress = function (event) {
//         //     if (event.lengthComputable) {
//         //         process.stderr.write(`Received ${event.loaded} of ${event.total} bytes`)
//         //     } else {
//         //         process.stderr.write(`Received ${event.loaded} bytes`) // no Content-Length
//         //     }
//         // }
//         // xhr.onerror = function () {
//         //     process.stderr.write("Request failed")
//         // }


//         // const agent = new https.Agent({
//         //     rejectUnauthorized: false
//         // })

//         axios(("https://localhost:7497/v1/portal/trsrv/stocks?symbols=" + ticker), {
//             method: 'GET',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             // httpsAgent: agent
//         })
//             .then((tickerResp) => {
//                 axios(("https://localhost:7497/v1/portal/iserver/marketdata/history?conid=" + tickerResp.data[ticker][0].contracts[0].conid + "&period=120d&bar=1d"), {
//                     method: 'GET',
//                     headers: {
//                         'Content-Type': 'application/json',
//                     },
//                     // timeout: 20000,
//                     // httpsAgent: agent
//                 })
//                     .then((dataResp) => {
//                         // if (ticker == "AGS") {
//                         //     console.log(dataResp)
//                         // }
//                         let levels = ["|1|"]
//                         let dayTouches = []
//                         let maxPrice = price + 1
//                         // console.log(price, maxPrice)
//                         for (let p = maxPrice; p > (price - 1); p = precisionRound(p - 0.01, 2)) {
//                             let touchesCount = 0
//                             for (let b = 0; b < dataResp.data.data.length; b++) {
//                                 // console.log(p, dataResp.data.data[b].o)
//                                 if (p == precisionRound(dataResp.data.data[b].o, 2) ||
//                                     p == precisionRound(dataResp.data.data[b].c, 2) ||
//                                     p == precisionRound(dataResp.data.data[b].l, 2) ||
//                                     p == precisionRound(dataResp.data.data[b].h, 2)) {
//                                     touchesCount++
//                                 }
//                                 // if ((p <= precisionRound(dataResp.data.data[b].o + 0.01, 2) && p >= precisionRound(dataResp.data.data[b].o - 0.01, 2)) ||
//                                 //     (p <= precisionRound(dataResp.data.data[b].c + 0.01, 2) && p >= precisionRound(dataResp.data.data[b].c - 0.01, 2)) ||
//                                 //     (p <= precisionRound(dataResp.data.data[b].l + 0.01, 2) && p >= precisionRound(dataResp.data.data[b].l - 0.01, 2)) ||
//                                 //     (p <= precisionRound(dataResp.data.data[b].h + 0.01, 2) && p >= precisionRound(dataResp.data.data[b].h - 0.01, 2))) {
//                                 //     touchesCount++
//                                 // } // not strong equality
//                             }
//                             if (touchesCount >= 5) {
//                                 dayTouches.push(p)
//                                 // if (ticker == "AGS") {
//                                 //     console.log(touchesCount, p)
//                                 // }
//                             }
//                         }


//                         let dayExtremums = []
//                         //     let barsBeforeLowest = 0
//                         //     let barsAfterLowest = 0
//                         //     let lowestPrice = dataResp.data.data[0].l // ?
//                         //     let barsBeforeHighest = 0
//                         //     let barsAfterHighest = 0
//                         //     let highestPrice = dataResp.data.data[0].h
//                         // for (let b = 0; b < dataResp.data.data.length; b++) {
//                         //     if (b < dataResp.data.data.length - 1) {
//                         //         if (dataResp.data.data[b + 1].l < lowestPrice) { //  dataResp.data.data[b].l means stepping down each bar, which is incorrect => lowestPrice
//                         //             lowestPrice = dataResp.data.data[b + 1].l
//                         //             barsBeforeLowest++
//                         //             barsAfterLowest = 0
//                         //         } else {
//                         //             barsAfterLowest++
//                         //         }
//                         //         if (barsBeforeLowest >= 3 && barsAfterLowest >= 3 && !dayExtremums.includes(lowestPrice)) { // 3 5
//                         //             dayExtremums.push(lowestPrice)
//                         //             console.log(lowestPrice)
//                         //             lowestPrice = dataResp.data.data[0].l // ?
//                         //         }

//                         //         if (dataResp.data.data[b + 1].h > highestPrice) { // dataResp.data.data[b].h
//                         //             highestPrice = dataResp.data.data[b + 1].h
//                         //             barsBeforeHighest++
//                         //             barsAfterHighest = 0
//                         //         } else {
//                         //             barsAfterHighest++
//                         //         }
//                         //         if (barsBeforeHighest >= 3 && barsAfterHighest >= 3 && !dayExtremums.includes(highestPrice)) {
//                         //             dayExtremums.push(highestPrice)
//                         //             console.log(highestPrice)
//                         //             highestPrice = dataResp.data.data[0].h
//                         //         }
//                         //     }
//                         // }

//                         for (let b = 0; b < dataResp.data.data.length; b++) {
//                             let barsBeforeLowest = 0
//                             let barsAfterLowest = 0
//                             let lowestPrice = dataResp.data.data[b].l
//                             let barsBeforeHighest = 0
//                             let barsAfterHighest = 0
//                             let highestPrice = dataResp.data.data[b].h
//                             for (let g = 1; g < 12; g++) { // 8 12
//                                 if (b + g < dataResp.data.data.length - 1) {
//                                     if (dataResp.data.data[b + g + 1].l < lowestPrice) { //  dataResp.data.data[b].l means stepping down each bar, which is incorrect => lowestPrice
//                                         lowestPrice = dataResp.data.data[b + g + 1].l
//                                         barsBeforeLowest++
//                                         barsAfterLowest = 0
//                                     } else {
//                                         barsAfterLowest++
//                                     }
//                                     if (barsBeforeLowest >= 5 &&
//                                         barsAfterLowest >= 5 &&
//                                         !dayExtremums.includes(lowestPrice) &&
//                                         lowestPrice >= price - 1 &&
//                                         lowestPrice <= price + 1
//                                     ) { // 3 5
//                                         dayExtremums.push(lowestPrice)
//                                         // if (ticker == "AGS") {
//                                         //     console.log("lowestPrice", lowestPrice, price - 1)
//                                         // }
//                                         // lowestPrice = dataResp.data.data[b].l
//                                         break
//                                     }

//                                     if (dataResp.data.data[b + g + 1].h > highestPrice) { // dataResp.data.data[b].h
//                                         highestPrice = dataResp.data.data[b + g + 1].h
//                                         barsBeforeHighest++
//                                         barsAfterHighest = 0
//                                     } else {
//                                         barsAfterHighest++
//                                     }
//                                     if (barsBeforeHighest >= 5 &&
//                                         barsAfterHighest >= 5 &&
//                                         !dayExtremums.includes(highestPrice) &&
//                                         highestPrice <= price + 1 &&
//                                         highestPrice >= price - 1
//                                     ) {
//                                         dayExtremums.push(highestPrice)
//                                         // if (ticker == "AGS") {
//                                         //     console.log("highestPrice", highestPrice, price + 1)
//                                         // }
//                                         // highestPrice = dataResp.data.data[b].h
//                                         break
//                                     }
//                                 }
//                             }
//                         }
//                         // console.log(extremums)
//                         levels = dayExtremums.concat(["|2|"], dayTouches)


//                         axios(("https://localhost:7497/v1/portal/iserver/marketdata/history?conid=" + tickerResp.data[ticker][0].contracts[0].conid + "&period=3d&bar=5min"), { // 5d => 3d
//                             method: 'GET',
//                             headers: {
//                                 'Content-Type': 'application/json',
//                             },
//                             // timeout: 20000,
//                             // httpsAgent: agent
//                         })
//                             .then((dataResp5min) => {
//                                 let rowTouches5min = []
//                                 for (let b = 0; b < dataResp5min.data.data.length; b++) {
//                                     let lowRowTouchesCount = 0
//                                     let highRowTouchesCount = 0
//                                     for (let g = 0; g < 3; g++) { // 3,5 bars in a row OCLH
//                                         if (b + g < dataResp5min.data.data.length - 1) {
//                                             if (dataResp5min.data.data[b].l == dataResp5min.data.data[b + g].l) {
//                                                 lowRowTouchesCount++
//                                             }
//                                             if (dataResp5min.data.data[b].h == dataResp5min.data.data[b + g].h) {
//                                                 highRowTouchesCount++
//                                             }
//                                             if (lowRowTouchesCount == 3 &&
//                                                 !rowTouches5min.includes(dataResp5min.data.data[b].l) &&
//                                                 dataResp5min.data.data[b].l <= price + 1 &&
//                                                 dataResp5min.data.data[b].l >= price - 1
//                                             ) {
//                                                 rowTouches5min.push(dataResp5min.data.data[b].l)
//                                             }
//                                             if (highRowTouchesCount == 3 &&
//                                                 !rowTouches5min.includes(dataResp5min.data.data[b].h) &&
//                                                 dataResp5min.data.data[b].h <= price + 1 &&
//                                                 dataResp5min.data.data[b].h >= price - 1
//                                             ) {
//                                                 rowTouches5min.push(dataResp5min.data.data[b].h)
//                                             }
//                                         }
//                                     }
//                                 }
//                                 levels = levels.concat(["|3|"], rowTouches5min)

//                                 // console.log(dataResp5min)
//                                 let touches5min = []
//                                 let maxPrice = price + 1
//                                 // console.log(price, maxPrice)
//                                 for (let p = maxPrice; p > (price - 1); p = precisionRound(p - 0.01, 2)) {
//                                     let touchesCount = 0
//                                     for (let b = 0; b < dataResp5min.data.data.length; b++) {
//                                         // console.log(p, dataResp5min.data.data[b].o)
//                                         if (
//                                             // p == precisionRound(dataResp5min.data.data[b].o, 2) || // LH only
//                                             // p == precisionRound(dataResp5min.data.data[b].c, 2) ||
//                                             p == precisionRound(dataResp5min.data.data[b].l, 2) ||
//                                             p == precisionRound(dataResp5min.data.data[b].h, 2)
//                                         ) {
//                                             touchesCount++
//                                         }
//                                     }
//                                     if (touchesCount >= 15) { // 5 bars => 6,8,10, 12 ,15,16,20,24 bars
//                                         touches5min.push(p)
//                                         // if (ticker == "AGS") {
//                                         //     console.log(touchesCount, p)
//                                         // }
//                                     }
//                                 }
//                                 levels = levels.concat(["|4|"], touches5min)

//                                 // 
//                                 // let extremums5min = []
//                                 //
//                                 // levels = levels.concat([""], extremums5min)

//                                 resolve(levels)
//                             })
//                             .catch((err) => {
//                                 process.stderr.write(err.toString())
//                             })
//                     })
//                     .catch((err) => {
//                         process.stderr.write(err.toString())
//                     })
//             })
//             .catch((err) => {
//                 process.stderr.write(err.toString())
//             })
//     })
// }

async function getLevels(ticker, price) {
    return ibkr({ port: "7497", host: "localhost" })
        .then(async started => {
            if (!started) {
                console.log('error cannot start ibkr')
                return process.exit(1)
            }

            const historyApi = HistoricalData.Instance
            const args = {
                symbol: ticker,
                durationStr: '120 D',
                barSizeSetting: '1 day',
            }
            const dayData = await historyApi.reqHistoricalData(args)
            // console.log(dayData)

            let levels = ["|1|"]
            let stocksDbInsert = {
                _id: ticker,
            }
            let dayTouches = []
            let maxPrice = price + 1
            // console.log(price, maxPrice)
            for (let p = maxPrice; p > (price - 1); p = precisionRound(p - 0.01, 2)) {
                let touchesCount = 0
                for (let b = 0; b < dayData.length; b++) {
                    if (p == precisionRound(dayData[b].open, 2) ||
                        p == precisionRound(dayData[b].close, 2) ||
                        p == precisionRound(dayData[b].low, 2) ||
                        p == precisionRound(dayData[b].high, 2)) {
                        touchesCount++
                    }
                }
                if (touchesCount >= 5) {
                    dayTouches.push(p)
                }
            }

            let dayExtremums = []
            for (let b = 0; b < dayData.length; b++) {
                let barsBeforeLowest = 0
                let barsAfterLowest = 0
                let lowestPrice = dayData[b].low
                let barsBeforeHighest = 0
                let barsAfterHighest = 0
                let highestPrice = dayData[b].high
                for (let g = 1; g < 12; g++) { // 8 12
                    if (b + g < dayData.length - 1) {
                        if (dayData[b + g + 1].low < lowestPrice) { //  dayData[b].low means stepping down each bar, which is incorrect => lowestPrice
                            lowestPrice = dayData[b + g + 1].low
                            barsBeforeLowest++
                            barsAfterLowest = 0
                        } else {
                            barsAfterLowest++
                        }
                        if (barsBeforeLowest >= 5 &&
                            barsAfterLowest >= 5 &&
                            !dayExtremums.includes(lowestPrice) &&
                            lowestPrice >= price - 1 &&
                            lowestPrice <= price + 1
                        ) { // 3 5
                            dayExtremums.push(lowestPrice)
                            // if (ticker == "AGS") {
                            //     console.log("lowestPrice", lowestPrice, price - 1)
                            // }
                            // lowestPrice = dayData[b].low
                            break
                        }

                        if (dayData[b + g + 1].high > highestPrice) { // dayData[b].high
                            highestPrice = dayData[b + g + 1].high
                            barsBeforeHighest++
                            barsAfterHighest = 0
                        } else {
                            barsAfterHighest++
                        }
                        if (barsBeforeHighest >= 5 &&
                            barsAfterHighest >= 5 &&
                            !dayExtremums.includes(highestPrice) &&
                            highestPrice <= price + 1 &&
                            highestPrice >= price - 1
                        ) {
                            dayExtremums.push(highestPrice)
                            // if (ticker == "AGS") {
                            //     console.log("highestPrice", highestPrice, price + 1)
                            // }
                            // highestPrice = dayData[b].high
                            break
                        }
                    }
                }
            }
            // console.log(extremums)
            levels = dayExtremums.concat(["|2|"], dayTouches)
            stocksDbInsert["dayExtremums"] = dayExtremums
            stocksDbInsert["dayTouches"] = dayTouches

            let rowTouches = []
            for (let b = 0; b < dayData.length; b++) {
                let lowRowTouchesCount = 0
                let highRowTouchesCount = 0
                for (let g = 0; g < 3; g++) { // TODO: 3,5 bars in a row OC LH
                    if (b + g < dayData.length - 1) {
                        if (dayData[b].low == dayData[b + g].low) {
                            lowRowTouchesCount++
                        }
                        if (dayData[b].high == dayData[b + g].high) {
                            highRowTouchesCount++
                        }
                        if (lowRowTouchesCount == 3 &&
                            !rowTouches.includes(dayData[b].low) &&
                            dayData[b].low <= price + 1 &&
                            dayData[b].low >= price - 1
                        ) {
                            rowTouches.push(dayData[b].low)
                        }
                        if (highRowTouchesCount == 3 &&
                            !rowTouches.includes(dayData[b].high) &&
                            dayData[b].high <= price + 1 &&
                            dayData[b].high >= price - 1
                        ) {
                            rowTouches.push(dayData[b].high)
                        }
                    }
                }
            }
            levels = levels.concat(["|3|"], rowTouches)
            stocksDbInsert["rowTouches"] = rowTouches


            const args5min = {
                symbol: ticker,
                durationStr: '3 D',
                barSizeSetting: '5 mins',
            }
            const data5min = await historyApi.reqHistoricalData(args5min)
            // console.log(data5min)

            let rowTouches5min = []
            for (let b = 0; b < data5min.length; b++) {
                let lowRowTouchesCount = 0
                let highRowTouchesCount = 0
                for (let g = 0; g < 5; g++) { // TODO: 3,5 bars in a row OC LH
                    if (b + g < data5min.length - 1) {
                        if (data5min[b].low == data5min[b + g].low) {
                            lowRowTouchesCount++
                        }
                        if (data5min[b].high == data5min[b + g].high) {
                            highRowTouchesCount++
                        }
                        if (lowRowTouchesCount == 5 &&
                            !rowTouches5min.includes(data5min[b].low) &&
                            data5min[b].low <= price + 1 &&
                            data5min[b].low >= price - 1
                        ) {
                            rowTouches5min.push(data5min[b].low)
                        }
                        if (highRowTouchesCount == 5 &&
                            !rowTouches5min.includes(data5min[b].high) &&
                            data5min[b].high <= price + 1 &&
                            data5min[b].high >= price - 1
                        ) {
                            rowTouches5min.push(data5min[b].high)
                        }
                    }
                }
            }
            levels = levels.concat(["|4|"], rowTouches5min)
            let hwDbInsert = {
                rowTouches5min: rowTouches5min
            }

            // console.log(data5min)
            let touches5min = []
            maxPrice = price + 1
            // console.log(price, maxPrice)
            for (let p = maxPrice; p > (price - 1); p = precisionRound(p - 0.01, 2)) {
                let touchesCount = 0
                for (let b = 0; b < data5min.length; b++) {
                    // console.log(p, data5min[b].open)
                    if (
                        // p == precisionRound(data5min[b].open, 2) || // TODO: LH only
                        // p == precisionRound(data5min[b].close, 2) ||
                        p == precisionRound(data5min[b].low, 2) ||
                        p == precisionRound(data5min[b].high, 2)
                    ) {
                        touchesCount++
                    }
                }
                if (touchesCount >= 10) { // TODO: 5 bars => 6,8,10, 12 ,15,16,20,24 bars
                    touches5min.push(p)
                    // if (ticker == "AGS") {
                    //     console.log(touchesCount, p)
                    // }
                }
            }
            levels = levels.concat(["|5|"], touches5min)
            hwDbInsert[touches5min] = touches5min

            // TODO: 
            // let extremums5min = []
            //
            // levels = levels.concat([""], extremums5min)

            // console.log(levels)

            let mClient = await new Promise(resolve => {
                MongoClient.connect("mongodb://127.0.0.1:27017", function (err, client) {
                    if (err) {
                        console.log("Mongo " + JSON.stringify(err))
                        return resolve()
                    }

                    const dbName = "trading"
                    const db = client.db(dbName)

                    const stocksCollection = db.collection('stocks')
                    stocksCollection.findOne({ _id: ticker }, function (err, tickerObj) {
                        if (err) {
                            console.log("Mongo " + JSON.stringify(err))
                            return resolve(client)
                        }

                        if (!tickerObj) {
                            stocksDbInsert["lastHomework"] = roundDate(new Date())
                            stocksCollection.insertOne(stocksDbInsert) // TODO: add sector, industry, instOwn, ATR, RSI
                            console.log("New ticker: " + ticker)
                        } else {
                            stocksCollection.updateOne({ _id: ticker }, {
                                $addToSet: { dayTouches: stocksDbInsert.dayTouches },
                                $addToSet: { dayExtremums: stocksDbInsert.dayExtremums },
                                $addToSet: { rowTouches: stocksDbInsert.rowTouches },
                                $set: { lastHomework: roundDate(new Date()) }
                            })
                        }
                    })

                    const homeworkCollection = db.collection('homework')
                    homeworkCollection.findOne({ _id: roundDate(new Date()) }, function (err, hwObj) {
                        if (err) {
                            console.log("Mongo " + JSON.stringify(err))
                            return resolve(client)
                        }

                        if (!hwObj) {
                            let insertObj = {
                                _id: roundDate(new Date())
                            }
                            insertObj[ticker] = {
                                touches5min: hwDbInsert.touches5min,
                                rowTouches5min: hwDbInsert.rowTouches5min
                            }
                            homeworkCollection.insertOne(insertObj)
                        } else {
                            let setObj = {}
                            setObj[ticker] = {
                                touches5min: hwDbInsert.touches5min,
                                rowTouches5min: hwDbInsert.rowTouches5min
                            }
                            homeworkCollection.updateOne({ _id: roundDate(new Date()) }, {
                                $set: setObj
                            })
                        }
                    })

                    resolve(client)

                })
            })

            await sleep(300)
            mClient.close()

            return levels
        })
}

async function getStocks(page, tickers, name, link, pageNum = 0) {
    // console.log(pageNum)
    await page.goto(link + (pageNum ? ("&r=" + (20 * pageNum + 1)) : ""), {
        timeout: 60000,
        waitUntil: "networkidle2"
    })
        .catch((error) => {
            process.stderr.write("ERR - Navigation timeout " + error)
            process.exit(1)
        })

    await sleep(2000)

    let nodes = await page.$$(".screener-link-primary")
    let stocks = []

    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i]

        const ticker = await page.evaluate(node => node.textContent, node)
        // process.stdout.write(ticker + "\n")

        // var parentNode = await page.evaluateHandle("(element) => element.parentNode.parentNode.children[3]", node)
        // const sector = await page.evaluate(parentNode => parentNode.textContent, parentNode)
        const sector = await page.evaluate(node => node.parentNode.parentNode.children[3].textContent, node)
        // process.stdout.write(sector + "\n")
        const industry = await page.evaluate(node => node.parentNode.parentNode.children[4].textContent, node)
        // process.stdout.write(industry + "\n")
        const instOwn = await page.evaluate(node => node.parentNode.parentNode.children[6].textContent, node)
        // process.stdout.write(instOwn + "\n")
        const ATR = await page.evaluate(node => node.parentNode.parentNode.children[9].textContent, node)
        // process.stdout.write(ATR + "\n")
        const RSI = await page.evaluate(node => node.parentNode.parentNode.children[12].textContent, node)
        // process.stdout.write(RSI + "\n")
        const price = await page.evaluate(node => node.parentNode.parentNode.children[15].textContent, node)
        // stocks.push({
        //     ticker: ticker,
        //     sector: sector,
        //     industry: industry,
        //     instOwn: instOwn,
        //     atr: ATR,
        //     rsi: RSI,
        // })
        if (!tickers.includes(ticker)) {

            console.log(ticker, price)
            let levels = []
            if (![""].includes(ticker)) { // TODO: 
                levels = await getLevels(ticker, precisionRound(parseFloat(price), 2))
            }

            stocks.push([
                "",
                ticker,
                sector,
                industry,
                instOwn,
                ATR,
                RSI,
                price,
            ].concat(levels))

            tickers.push(ticker)
        }
    }

    if (nodes.length == 20) {
        let innerArr = await getStocks(page, tickers, name, link, pageNum + 1)
        stocks = stocks.concat(innerArr["stocks_" + name])
        tickers = innerArr["tickers_" + name]
    }

    let obj = {}
    obj["stocks_" + name] = stocks
    obj["tickers_" + name] = tickers

    return obj
}

function neverResolve() {
    process.stdout.write("Reached never resolve point\n")
    return new Promise(resolve => { })
}

async function run() {

    process.stdout.write("start time " + new Date().toLocaleTimeString() + "\n")
    const browser = await puppeteer.launch({
        headless: false,
        // slowMo: 50,
        ignoreHTTPSErrors: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', "--proxy-server='direct://'", '--proxy-bypass-list=*']
    })
    const page = await browser.newPage()

    // page.on('console', msg => process.stdout.write(`CONSOLE LOG: ${msg.text()}\n`))
    // page.on('requestfailed', request => process.stdout.write(`CONSOLE REQUST FAILED LOG ERROR: ${request.url()} ${request.failure().errorText}\n`))
    // page.on('error', err => {
    //     process.stderr.write(`CONSOLE LOG ERROR: ${err.toString()}\n`)
    //     process.exit(1)
    // })
    // page.on('pageerror', err => process.stderr.write(`CONSOLE PAGE LOG ERROR: ${err.toString()}\n`))

    let results = [[
        "",
        "Ticker",
        "Sector",
        "Industry",
        "Inst Own",
        "ATR",
        "RSI",
        "Price",
        "Levels",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
    ], [
        (new Date()).toDateString(),
    ]]

    let tickers = []


    //price_3to10 
    //price_2to8 ,exch_nyse
    //price_2to8 + any exchange
    //sh_avgvol_150to1500 -> sh_avgvol_200to1500 + sh_curvol:o200
    //ind:stocksonly
    //sh_avgvol_200to1500 -> sh_avgvol_200to2500
    //sh_avgvol_200to2500 -> sh_avgvol_200to5000
    //price_2to8 -> sh_price_u7
    //earningsdate_today -> earningsdate_thisweek


    results = results.concat([["thisWeekEarnings",]])
    const { stocks_thisWeekEarnings, tickers_thisWeekEarnings } = await getStocks(page, tickers, "thisWeekEarnings", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,earningsdate_thisweek,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5&ft=4&&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    if (tickers_thisWeekEarnings.length > 0) {
        console.log("\n This week earnings: " + tickers_thisWeekEarnings + "\n")
    }
    tickers = tickers_thisWeekEarnings
    results = results.concat(stocks_thisWeekEarnings, [["todayPlus5",]])
    const { stocks_todayPlus5, tickers_todayPlus5 } = await getStocks(page, tickers, "todayPlus5", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_perf_d5o&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_todayPlus5
    results = results.concat(stocks_todayPlus5, [["todayMinus5",]])

    // process.stdout.write(JSON.stringify(stocks_todayMinus5))
    // process.stdout.write("\n")
    // process.stdout.write(JSON.stringify(tickers_todayMinus5))
    // process.stdout.write("\n")
    // process.stdout.write(JSON.stringify(results))
    // process.stdout.write("\n")
    // process.stdout.write(JSON.stringify(tickers))

    const { stocks_todayMinus5, tickers_todayMinus5 } = await getStocks(page, tickers, "todayMinus5", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_perf_d5u&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_todayMinus5
    results = results.concat(stocks_todayMinus5, [["weekMinus10",]])
    const { stocks_weekMinus10, tickers_weekMinus10 } = await getStocks(page, tickers, "weekMinus10", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_perf_1w10u&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_weekMinus10
    results = results.concat(stocks_weekMinus10, [["weekPlus10",]])
    const { stocks_weekPlus10, tickers_weekPlus10 } = await getStocks(page, tickers, "weekPlus10", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_perf_1w10o&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_weekPlus10
    results = results.concat(stocks_weekPlus10, [["monthPlus30",]])
    const { stocks_monthPlus30, tickers_monthPlus30 } = await getStocks(page, tickers, "monthPlus30", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_perf_4w30o&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_monthPlus30
    results = results.concat(stocks_monthPlus30, [["monthMinus30",]])
    const { stocks_monthMinus30, tickers_monthMinus30 } = await getStocks(page, tickers, "monthMinus30", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_perf_4w30u&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_monthMinus30
    results = results.concat(stocks_monthMinus30, [["days20_5AboveLow",]])
    const { stocks_days20_5AboveLow, tickers_days20_5AboveLow } = await getStocks(page, tickers, "days20_5AboveLow", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_highlow20d_a0to5h&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_days20_5AboveLow
    results = results.concat(stocks_days20_5AboveLow, [["days20_5BelowHigh",]])
    const { stocks_days20_5BelowHigh, tickers_days20_5BelowHigh } = await getStocks(page, tickers, "days20_5BelowHigh", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_highlow20d_b0to5h&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_days20_5BelowHigh
    results = results.concat(stocks_days20_5BelowHigh, [["weeks52_5BelowHigh",]])
    const { stocks_weeks52_5BelowHigh, tickers_weeks52_5BelowHigh } = await getStocks(page, tickers, "weeks52_5BelowHigh", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_highlow52w_b0to5h&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_weeks52_5BelowHigh
    results = results.concat(stocks_weeks52_5BelowHigh, [["weeks52_AboveLow",]])
    const { stocks_weeks52_AboveLow, tickers_weeks52_AboveLow } = await getStocks(page, tickers, "weeks52_AboveLow", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_highlow52w_a0to5h&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_weeks52_AboveLow
    results = results.concat(stocks_weeks52_AboveLow, [["up5",]])
    const { stocks_up5, tickers_up5 } = await getStocks(page, tickers, "up5", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_changeopen_u5&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_up5
    results = results.concat(stocks_up5, [["down5",]])
    const { stocks_down5, tickers_down5 } = await getStocks(page, tickers, "down5", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_changeopen_d5&ft=4&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_down5
    results = results.concat(stocks_down5, [["horizontal_S/R",]])
    const { stocks_horizontalSR, tickers_horizontalSR } = await getStocks(page, tickers, "horizontalSR", 'https://finviz.com/screener.ashx?v=150&f=cap_microover,geo_usa,sh_avgvol_200to5000,sh_curvol_o200,sh_price_u7,ta_averagetruerange_o0.5,ta_pattern_horizontal&ft=4&&o=-change&c=0,1,2,3,4,6,28,42,43,49,57,58,59,60,63,65,66,67')
    tickers = tickers_horizontalSR
    results = results.concat(stocks_horizontalSR)

    // console.log(results)

    const ws = fs.createWriteStream("./csv/" + (new Date()).toDateString() + ".csv")
    fastcsv
        .write(results, { headers: true })
        .pipe(ws)
    // .then(() => {
    //     process.exit(0)
    // })
    process.stdout.write("end time " + new Date().toLocaleTimeString() + "\n")
    await sleep(5000)
    process.exit(0)
}

run()