/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

const utils = require('@iobroker/adapter-core');
const axios = require('axios');
const adapterName = require('./package.json').name.split('.').pop();

class Luftdaten extends utils.Adapter {

    constructor(options) {
        super({
            ...options,
            name: adapterName,
        });

        this.killTimeout = null;

        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.getDevices(
            async (err, states) => {

                const sensorsAll = [];
                const sensorsKeep = [];

                // Collect all types
                if (states) {
                    for (let i = 0; i < states.length; i++) {
                        const id = this.removeNamespace(states[i]._id);

                        // Check if the state is a direct child (device)
                        if (id.indexOf('.') === -1) {
                            sensorsAll.push(id);
                            this.log.debug('sensor device exists: ' + id);
                        }
                    }
                }

                const sensors = this.config.sensors;

                if (sensors && Array.isArray(sensors)) {
                    this.log.debug('Found ' + sensors.length + ' sensors, fetching data');

                    for (const s in sensors) {
                        const sensor = sensors[s];

                        const sensorName = await this.getSensorData(sensor);

                        if (sensorName) {
                            sensorsKeep.push(sensorName);
                            this.log.debug('sensor found: ' + sensorName);
                        }
                    }
                } else {
                    this.log.warn('No sensors configured');
                }

                // Delete non existent sensors
                for (let i = 0; i < sensorsAll.length; i++) {
                    const id = sensorsAll[i];

                    if (sensorsKeep.indexOf(id) === -1) {
                        this.delObject(id, {recursive: true}, () => {
                            this.log.debug('sensor device deleted: ' + id);
                        });
                    }
                }

                this.killTimeout = setTimeout(this.stop.bind(this), 15 * 1000); // 15 Seconds
            }
        );
    }

    async getSensorData(sensor) {

        const unitList = {
            P1: 'µg/m³',
            P2: 'µg/m³',
            temperature: '°C',
            humidity: '%',
            pressure: 'Pa',
            pressure_at_sealevel: 'Pa',
            noise: 'dB(A)',
            signal: 'dB(A)',
            min_micro: 'µs',
            max_micro: 'µs'
        };

        const roleList = {
            P1: 'value.ppm',
            P2: 'value.ppm',
            temperature: 'value.temperature',
            humidity: 'value.humidity',
            pressure: 'value.pressure',
            pressure_at_sealevel: 'value.pressure',
            noise: 'value',
            signal: 'value',
            min_micro: 'value',
            max_micro: 'value'
        };

        const sensorType = sensor.type;
        const sensorIdentifier = sensor.identifier;
        const sensorName = (sensor.name === '') ? sensorIdentifier : sensor.name;

        if (sensorIdentifier && sensorName) {
            const deviceName = (sensorType == 'local') ? sensorIdentifier.replace(/\./g, '_') : sensorIdentifier.replace(/\D/g,'');
            const path = deviceName + '.';

            this.log.debug('sensor type: ' + sensorType + ', sensor identifier: ' + sensorIdentifier + ', sensor name: ' + sensorName);

            await this.setObjectNotExistsAsync(deviceName, {
                type: 'device',
                common: {},
                native: {}
            });

            this.extendObjectAsync(deviceName, {
                common: {
                    name: sensorName
                }
            });

            await this.setObjectNotExistsAsync(path + 'name', {
                type: 'state',
                common: {
                    name: 'Sensor name',
                    type: 'string',
                    role: 'text'
                },
                native: {}
            });
            this.setState(path + 'name', {val: sensorName, ack: true});

            await this.setObjectNotExistsAsync(path + 'responseCode', {
                type: 'state',
                common: {
                    name: 'responseCode',
                    type: 'number',
                    role: 'value',
                    read: true,
                    write: false
                },
                native: {}
            });

            if (sensorType == 'local') {
                this.log.debug('local request started');

                axios({
                    method: 'get',
                    baseURL: 'http://' + sensorIdentifier + '/',
                    url: '/data.json',
                    timeout: 10000,
                    responseType: 'json'
                }).then(
                    async (response) => {
                        const content = response.data;

                        this.log.debug('local request done');
                        this.log.debug('received data (' + response.status + '): ' + JSON.stringify(content));

                        this.setState(path + 'responseCode', {val: response.status, ack: true});

                        if (content && Object.prototype.hasOwnProperty.call(content, 'sensordatavalues')) {
                            for (const key in content.sensordatavalues) {
                                const obj = content.sensordatavalues[key];

                                let unit = null;
                                let role = 'value';

                                if (obj.value_type.indexOf('SDS_') == 0) {
                                    unit = 'µg/m³';
                                    role = 'value.ppm';
                                } else if (obj.value_type.indexOf('temperature') >= 0) {
                                    unit = '°C';
                                    role = 'value.temperature';
                                } else if (obj.value_type.indexOf('humidity') >= 0) {
                                    unit = '%';
                                    role = 'value.humidity';
                                } else if (obj.value_type.indexOf('pressure') >= 0) {
                                    unit = 'Pa';
                                    role = 'value.pressure';
                                } else if (obj.value_type.indexOf('noise') >= 0) {
                                    unit = 'dB(A)';
                                    role = 'value';
                                } else if (Object.prototype.hasOwnProperty.call(unitList, obj.value_type)) {
                                    unit = unitList[obj.value_type];
                                    role = roleList[obj.value_type];
                                }

                                await this.setObjectNotExistsAsync(path + obj.value_type, {
                                    type: 'state',
                                    common: {
                                        name: obj.value_type,
                                        type: 'number',
                                        role: role,
                                        unit: unit,
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                this.setState(path + obj.value_type, {val: parseFloat(obj.value), ack: true});
                            }
                        } else {
                            this.log.warn('Response has no valid content. Check hostname/IP address and try again.');
                        }

                    }
                ).catch(
                    (error) => {
                        if (error.response) {
                            // The request was made and the server responded with a status code

                            this.log.warn('received error ' + error.response.status + ' response from local sensor ' + sensorIdentifier + ' with content: ' + JSON.stringify(error.response.data));
                        } else if (error.request) {
                            // The request was made but no response was received
                            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                            // http.ClientRequest in node.js<div></div>
                            this.log.error(error.message);
                        } else {
                            // Something happened in setting up the request that triggered an Error
                            this.log.error(error.message);
                        }
                    }
                );

            } else if (sensorType == 'remote') {
                this.log.debug('remote request started');

                axios({
                    method: 'get',
                    baseURL: 'https://data.sensor.community/airrohr/v1/sensor/',
                    url: '/' + sensorIdentifier.replace(/\D/g,'') + '/',
                    timeout: 10000,
                    responseType: 'json'
                }).then(
                    async (response) => {
                        const content = response.data;

                        this.log.debug('remote request done');
                        this.log.debug('received data (' + response.status + '): ' + JSON.stringify(content));

                        this.setState(path + 'responseCode', {val: response.status, ack: true});

                        if (content && Array.isArray(content) && content.length > 0) {
                            const sensorData = content[0];

                            if (sensorData && Object.prototype.hasOwnProperty.call(sensorData, 'sensordatavalues')) {
                                for (const key in sensorData.sensordatavalues) {
                                    const obj = sensorData.sensordatavalues[key];

                                    let unit = null;
                                    let role = 'value';

                                    if (obj.value_type.indexOf('noise') >= 0) {
                                        unit = 'dB(A)';
                                        role = 'value';
                                    } else if (Object.prototype.hasOwnProperty.call(unitList, obj.value_type)) {
                                        unit = unitList[obj.value_type];
                                        role = roleList[obj.value_type];
                                    }

                                    await this.setObjectNotExistsAsync(path + 'SDS_' + obj.value_type, {
                                        type: 'state',
                                        common: {
                                            name: obj.value_type,
                                            type: 'number',
                                            role: role,
                                            unit: unit,
                                            read: true,
                                            write: false
                                        },
                                        native: {}
                                    });
                                    this.setState(path + 'SDS_' + obj.value_type, {val: parseFloat(obj.value), ack: true});
                                }
                            } else {
                                this.log.warn('Response has no valid content. Check hostname/IP address and try again.');
                            }

                            if (Object.prototype.hasOwnProperty.call(sensorData, 'location')) {
                                await this.setObjectNotExistsAsync(path + 'location', {
                                    type: 'channel',
                                    common: {
                                        name: 'Location',
                                        role: 'value.gps'
                                    },
                                    native: {}
                                });

                                await this.setObjectNotExistsAsync(path + 'location.longitude', {
                                    type: 'state',
                                    common: {
                                        name: 'Longtitude',
                                        type: 'number',
                                        role: 'value.gps.longitude',
                                        unit: '°',
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                this.setState(path + 'location.longitude', {val: parseFloat(sensorData.location.longitude), ack: true});

                                await this.setObjectNotExistsAsync(path + 'location.latitude', {
                                    type: 'state',
                                    common: {
                                        name: 'Latitude',
                                        type: 'number',
                                        role: 'value.gps.latitude',
                                        unit: '°',
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                this.setState(path + 'location.latitude', {val: parseFloat(sensorData.location.latitude), ack: true});

                                await this.setObjectNotExistsAsync(path + 'location.altitude', {
                                    type: 'state',
                                    common: {
                                        name: 'Altitude',
                                        type: 'number',
                                        role: 'value.gps.elevation',
                                        unit: 'm',
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                this.setState(path + 'location.altitude', {val: parseFloat(sensorData.location.altitude), ack: true});

                                await this.setObjectNotExistsAsync(path + 'timestamp', {
                                    type: 'state',
                                    common: {
                                        name: 'Last Update',
                                        type: 'number',
                                        role: 'date',
                                        read: true,
                                        write: false
                                    },
                                    native: {}
                                });
                                this.setState(path + 'timestamp', {val: new Date(sensorData.timestamp).getTime(), ack: true});
                            }
                        } else {
                            this.log.warn('Response was empty');
                        }
                    }
                ).catch(
                    (error) => {
                        if (error.response) {
                            // The request was made and the server responded with a status code

                            this.log.warn('received error ' + error.response.status + ' response from remote sensor ' + sensorIdentifier + ' with content: ' + JSON.stringify(error.response.data));
                            this.setState(path + 'responseCode', {val: error.response.status, ack: true});

                        } else if (error.request) {
                            // The request was made but no response was received
                            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                            // http.ClientRequest in node.js
                            this.log.error(error.message);
                            this.setState(path + 'responseCode', {val: -1, ack: true});
                        } else {
                            // Something happened in setting up the request that triggered an Error
                            this.log.error(error.message);
                            this.setState(path + 'responseCode', {val: -99, ack: true});
                        }
                    }
                );
            }

            return deviceName;
        } else {
            this.log.debug('sensor type and/or sensor identifier not defined');

            return null;
        }
    }

    removeNamespace(id) {
        const re = new RegExp(this.namespace + '*\.', 'g');
        return id.replace(re, '');
    }

    onUnload(callback) {
        try {

            if (this.killTimeout) {
                this.log.debug('clearing kill timeout');
                clearTimeout(this.killTimeout);
            }

            this.log.debug('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Luftdaten(options);
} else {
    // otherwise start the instance directly
    new Luftdaten();
}
