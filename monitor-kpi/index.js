const iothub = require('azure-iothub')
const _ = require("lodash")
const already_dropped = new Set();

module.exports = async function (context, req) {
    /** @type {Set<string>} */

    if (req.body && req.body.length) {
        await Promise.all(req.body.flatMap(elem => {
            const {Device, KPI} = elem
            if (Device === undefined || KPI === undefined) {
                context.log("Invalid entry: ", elem)
                return [];
            }
            if (KPI < 0.9) {
                return [LowerProduction(Device)]
            } else {
                return []
            }
        }))

        context.res = { status: 200 }
    } else {
        // we did not get a list of entries
        context.res = {
            status:  400
        }
    }
}

/**
 * Request the production to be lowered by 10 percent points
 * @param {String} Device The name of the device to alter
 */
async function LowerProduction(Device) {
    if (already_dropped.has(Device)) {
        return; // we don't want to drop multiple times just because we were batched
    }

    const connectionString = process.env[`IOTHUB_CONNECTION_STRING`];
    if (connectionString !== undefined) {
        try {
            const registry = iothub.Registry.fromConnectionString(connectionString);
            const realTwin = await registry.getTwin(Device)
            const currentProd = await realTwin.responseBody.properties.desired['ProductionRate']
            await registry.updateTwin(Device, {
                properties: {
                    desired: {
                        ProductionRate: Math.max(0, currentProd - 10)
                    }
                }
            })
        } catch (err) {
            context.log(`Failed to lower production on device ${Device}. Reason: ${err.toString()}`)
        }
    } else {
        context.log(`No connection string set for device ${Device}`)
    }
}