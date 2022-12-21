const iothub = require('azure-iothub')
const _ = require("lodash")
const already_sent = new Set();

module.exports = async function (context, req) {
    /** @type {Set<string>} */

    if (req.body && req.body.length) {
        await Promise.all(req.body.flatMap(elem => {
            const {Device, unknown, sensor, power, emergency} = elem
            if (Device === undefined) {
                context.log("Invalid entry: ", elem)
                return [];
            }
            if (unknown + sensor + power + emergency > 3) {
                return [EmergencyStop(context, Device)]
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
 * Request the device to be stopped
 * @param {String} Device The name of the device to stopped
 */
async function EmergencyStop(context, Device) {
    if (already_sent.has(Device)) {
        return; // avoid sending multiple times because of batching
    }

    const connectionString = process.env[`IOTHUB_CONNECTION_STRING`];
    if (connectionString !== undefined) {
        try {
            const client = iothub.Client.fromConnectionString(connectionString)
            await client.invokeDeviceMethod(Device, {
                methodName: "EmergencyStop",
                responseTimeoutInSeconds: 15
            })
        } catch (err) {
        }
    } else {
        context.log(`No connection string for iothub`)
    }
}